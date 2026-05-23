# REVIEW_REPORT.md — pre-Phase-1 audit

Scope: scaffold w stanie `de6622c` (main). Zweryfikowano: struktura, configi, Supabase clients, auth flow, migracje SQL, Edge Function stuby. Pominięto: testy, accessibility, performance, niskopoziomowy audyt RLS (Faza 6 / osobna sesja).

**TL;DR (oryginalny):** Scaffold jest dobrze ułożony i builduje się czysto, ale ma **5 realnych blokerów** Fazy 1 — wszystkie w warstwie bazy / RLS / auth-pipeline. Najbardziej krytyczne: brak triggera `handle_new_user` oraz dziurawa policy na `time_slots`.

---

## Status update — 2026-05-23

**Wszystkie 5 must-fix-ów zaadresowane.** Faza 1 jest odblokowana.

- ✅ #1–#4 — naprawione w nowej migracji `supabase/migrations/20260523000001_phase1_fixes.sql`. Aplikowana na live Supabase (uveeqjidyuumcddnfnop) przez SQL Editor 2026-05-23. Backfill potwierdzony zapytaniem `SELECT * FROM public.users` — wiersz Michała Kołodziejczyka istnieje, `role='resident'`, `oauth_provider='google'`.
- ✅ #5 — `src/lib/types/database.ts` zastąpiony permissive stubem z index signature. `from('orders')` typechecka, ale payloady są `Record<string, unknown>` więc Faza 1 i tak musi walidować przez Zod. Realny regen przez `npx supabase gen types typescript --project-id uveeqjidyuumcddnfnop` jest komentarzem w pliku — do zrobienia gdy będzie wygodnie, nie blokuje pracy.

`npm run typecheck` + `npm run build` — oba zielone po fixach (zweryfikowane przez Claude Code review session 2026-05-23).

Sekcje ❌ MUST FIX poniżej zostawione jako historyczny zapis problemu + rozwiązania.

---

## ✅ MUST FIX — RESOLVED 2026-05-23

### 1. Brak triggera `handle_new_user` — public.users nigdy nie powstaje po OAuth

**Plik:** `supabase/migrations/20260516000001_initial_schema.sql:72-86`

Tabela `users` ma `id uuid PRIMARY KEY REFERENCES auth.users(id)` i `email NOT NULL`, ale nie ma triggera `AFTER INSERT ON auth.users` który by tworzył odpowiadający wiersz w `public.users`. Skutek: po pierwszym Google OAuth user trafia do `auth.users`, ale `public.users` jest puste → `is_admin()`, `is_jokusor()`, `current_role_id()` (02_rls_policies.sql:11-27) zawsze zwracają `false`/`NULL` → cała RLS się rozjeżdża. Aktualnie działa tylko home page bo używa `supabase.auth.getUser()` (auth schema), ale każdy `from('users')` albo `from('orders')` zwróci 0 wierszy.

**Fix:** dodaj funkcję + trigger:
```sql
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, oauth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Migracja 04. Plus backfill istniejących userów (jeśli logowałeś się na proda w setupie).

---

### 2. RLS dziura na `time_slots` — każdy może wstawiać sloty

**Plik:** `supabase/migrations/20260516000002_rls_policies.sql:196-198`

```sql
CREATE POLICY "slots_insert_system" ON time_slots
  FOR INSERT WITH CHECK (true);
  -- inserty są zawsze przez Edge Function (slot-finder)
```

Komentarz mówi co ma być, kod robi co innego. **Każdy zalogowany user** może wstawić dowolny `time_slot` dla dowolnego jokusora i dowolnego zakresu → trywialny DoS rezerwacjami + obejście slot-findera. `EXCLUDE USING gist` zabezpiecza tylko przed nakładaniem, nie przed zalewem holdami.

**Fix:** zdejmij policy, wstawiaj sloty tylko service-role (Edge Function `slot-finder` używa service key), albo zrób `SECURITY DEFINER` function `create_hold(...)` i daj policy dla niej. Najprościej: usuń policy `slots_insert_system` i wstawiaj wyłącznie przez `createAdminClient()`/Edge Function.

---

### 3. `jokusor_serves_address` — bug w geo-fallbacku

**Plik:** `supabase/migrations/20260516000001_initial_schema.sql:614-638` (linia 636 konkretnie)

```sql
RETURN p_point && (SELECT boundary FROM estates WHERE id = j.estate_id);
```

Dwa problemy:
1. `&&` to operator **bounding-box overlap**, nie containment. Punkt "wpadnie" do osiedla jeśli mieści się w prostokącie opasującym polygon — false positives na granicach.
2. `&&` jest zdefiniowany dla `geometry`, nie `geography`. Na typie `geography` w PostGIS to się albo nie skompiluje, albo będzie wymagać niejawnego castu i zwróci śmieci.

Funkcja jest podstawą dla `/api/orders` (krok 3-4 w endpoints.md) — bez niej slot-finder nie wie kogo zaprosić do oferty.

**Fix:** zamień linię 636 na:
```sql
RETURN EXISTS (
  SELECT 1 FROM estates
  WHERE id = j.estate_id
    AND ST_Covers(boundary, p_point)
);
```

---

### 4. `order_events` INSERT policy blokuje system events

**Plik:** `supabase/migrations/20260516000002_rls_policies.sql:222-227`

```sql
CREATE POLICY "events_insert_jokusor" ON order_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_id AND jokusor_id = auth.uid()
    )
  );
```

Wg `docs/api/01_endpoints.md` (sekcja POST /api/orders, krok 7 + sekcja Webhooks, krok 6) eventy `'created'` i `'paid'` powstają **zanim** zamówienie ma przypisanego jokusora (w stanie `hold`/`pending`). Mieszkaniec też nie może ich wstawić — nie pasuje do żadnej `INSERT` policy → wszystkie ścieżki tworzenia zamówienia od razu nie spełnią warunku i rzucą RLS error.

**Fix:** dodaj osobne policy:
```sql
CREATE POLICY "events_insert_resident_create" ON order_events
  FOR INSERT WITH CHECK (
    event_type = 'created'
    AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND resident_id = auth.uid())
  );
```
Eventy z webhooka (`paid`, `refunded`) wstawiaj service-rolem — żadnej policy nie trzeba.

---

### 5. `database.ts` to pusty stub — pierwsze realne query wybuchnie TS

**Plik:** `src/lib/types/database.ts:9-17`

```typescript
export interface Database {
  public: {
    Tables: Record<string, never>;
    ...
  };
}
```

`npm run typecheck` jest zielony tylko dlatego, że nikt jeszcze nie pisał `supabase.from('orders')` — każdy taki call w Fazie 1 zwróci `Argument of type '"orders"' is not assignable to parameter of type 'never'`.

**Fix:** uruchom `npx supabase gen types typescript --project-id uveeqjidyuumcddnfnop > src/lib/types/database.ts` (klucz z `.env.local`). Skrypt `supabase:types` w `package.json:13` używa bash syntax `$SUPABASE_PROJECT_ID` — pod PowerShell to nie zadziała, popraw na `${env:SUPABASE_PROJECT_ID}` albo wpisz project-id na sztywno.

---

## ⚠️ SHOULD FIX (przed publicznym launchem)

### 6. Duplikat: Edge Function vs Next route dla webhooka i trackingu

**Pliki:**
- `supabase/functions/przelewy24-webhook/index.ts` vs `src/app/api/webhooks/przelewy24/.gitkeep`
- `supabase/functions/tracking-broadcast/index.ts` vs `src/app/api/tracking/update/.gitkeep`

Dwa stuby do tej samej odpowiedzialności. Panel Przelewy24 przyjmuje **jeden** URL powiadomień (`SETUP_GUIDE.md:242`). Trzeba wybrać. Dla webhooka rekomendacja: Next route (jednolite logowanie z resztą API). Dla trackingu spec (`docs/architecture/04_realtime_tracking.md:30-46`) pokazuje klienta publikującego **bezpośrednio** przez `supabase.channel().send(...)` — Edge Function jest niepotrzebny, usuń stub.

### 7. Migracja 03 to leftover po seedzie

**Plik:** `supabase/migrations/20260516000003_seed_modules.sql` (cała) + duplikat w `20260516000001_initial_schema.sql:700-725`

Moduły są już zaseedowane na końcu migracji 01 (24 INSERT-y). Plik 03 to TODO-stub z zakomentowanymi `INSERT`-ami i innymi nazwami slugów (`parcel_pickup` vs `package-pickup`). Dwa źródła prawdy → ktoś tego nie zauważy i dopisze konflikt.

**Fix:** usuń plik 03 albo przenieś seed z 01 do 03 (czystsze: schemat osobno, dane osobno). Sync slugów.

### 8. `tsconfig.json` ma `"jsx": "react-jsx"` zamiast `"preserve"`

**Plik:** `tsconfig.json:18`

Next.js docs wymagają `"jsx": "preserve"` (Next obsługuje JSX przez SWC). Build aktualnie jest zielony, ale to non-standard i przy bumpach Next-a może się odbić.

### 9. `updateSession` middleware bez try/catch wokół `getUser()`

**Plik:** `src/lib/supabase/middleware.ts:47`

```typescript
await supabase.auth.getUser();
```

Jeśli Supabase rzuci (timeout, 500, zła sesja), proxy crashuje cały request **łącznie z publicznymi stronami** `/privacy` i `/data-deletion`. Te dwie strony są wymagane przez Facebook OAuth review (CLAUDE.md) i muszą być dostępne nawet przy padzie Supabase.

**Fix:** owijka try/catch + `console.warn`; przy fail po prostu `return response` bez refreshu.

### 10. `OAuthButtons` — brak obsługi błędu z `signInWithOAuth`

**Plik:** `src/components/shared/OAuthButtons.tsx:29-33`

```typescript
await supabase.auth.signInWithOAuth({
  provider,
  options: { redirectTo: `${APP_URL}/callback` }
});
```

Brak `{ data, error } = await ...`. Gdy Supabase odmówi providera (np. wyłączony w panelu po deploy bez restart), user widzi przycisk który nic nie robi — żadnej informacji, żadnego logowania. Plus brak loading state na buttonie (double-click = dwa otwarcia OAuth flow).

### 11. `proxy.ts` matcher nie wyklucza `/api/webhooks/*`

**Plik:** `src/proxy.ts:11-16`

Matcher leci po wszystkim co nie jest static. Webhooki Przelewy24 (i Supabase auth webhook ze spec) NIE potrzebują session refresh i powodują niepotrzebne wywołanie do Supabase Auth przy każdym callbacku P24.

**Fix:** dodaj `api/webhooks` do negative-lookahead w regexie.

### 12. Brak konfiguracji ESLint

**Plik:** `package.json:10` (`"lint": "next lint"`), brak `.eslintrc.*`

`npm run lint` zapyta interaktywnie o setup → wyłoży CI. CLAUDE.md mówi "skip it but note in PR" — ale to bramka dla code-review, nie nice-to-have. Dodaj `.eslintrc.json`:
```json
{ "extends": ["next/core-web-vitals"] }
```
Plus `eslint` + `eslint-config-next` do devDeps.

### 13. `package.json.description` nadal mówi "Next.js 14"

**Plik:** `package.json:5`

Projekt jest na Next 16.2.6 — opis kłamie. Drobiazg, ale wprowadza w błąd przy onboardingu cudzych oczu.

### 14. CLAUDE.md mówi `src/middleware.ts`, faktyczny plik to `src/proxy.ts`

**Plik:** `CLAUDE.md:54` ("middleware.ts Session refresh")

Sam plik jest poprawny (Next 16 wprowadził `PROXY_FILENAME = 'proxy'` — zweryfikowane w `node_modules/next/dist/lib/constants.js`), ale dokumentacja kłamie. Popraw wzmiankę w CLAUDE.md.

---

## ✓ OK (sprawdzone, działa)

### Supabase clients — pełna zgodność z @supabase/ssr 0.5.x + Next 15+

- `src/lib/supabase/server.ts:9-10` — `cookies()` awaited, get/set/remove w try/catch (poprawnie obsługuje "called from Server Component" caveat).
- `src/lib/supabase/client.ts` — `createBrowserClient` z generykiem `<Database>`, env-vary z `NEXT_PUBLIC_` prefiksem.
- `src/lib/supabase/admin.ts:12-14` — service role z `persistSession: false`, throw przy braku klucza, **nie eksportowany do klienta**.
- `src/lib/supabase/middleware.ts` — graceful skip gdy env vars puste (dobry UX dev), poprawnie propaguje cookies przez `request.cookies.set` + `response.cookies.set`.

### Proxy / middleware setup w Next 16

- `src/proxy.ts:1-16` — zweryfikowane: Next 16.2.6 ma w `dist/lib/constants.js` `PROXY_FILENAME = 'proxy'` i `PROXY_LOCATION_REGEXP = (?:src/)?proxy`. Lokalizacja i nazwa funkcji `export async function proxy(...)` są prawidłowe.

### OAuth flow end-to-end semantically correct

- `login/page.tsx → OAuthButtons.tsx → signInWithOAuth → /callback/route.ts → exchangeCodeForSession → /home`.
- `(auth)/callback/route.ts:13-17` — `await createClient()`, `exchangeCodeForSession(code)`, fallback redirect do `/login?error=oauth_failed`.
- `(resident)/home/page.tsx:16-22` — server-side getUser + redirect gdy null. Server Action signOut z `'use server'` na linii 9 — poprawnie.

### Struktura katalogów

105 katalogów, `.gitkeep` w pustych — zgodnie z opisem w CLAUDE.md. Route groups `(auth)`, `(resident)`, `(jokusor)`, `(admin)` nie pojawiają się w URL-ach. Publiczne `/privacy` i `/data-deletion` **poza** `(auth)` group — dobrze, nie dziedziczą AuthLayout, dostępne dla crawlerów Facebooka.

### Constraint `EXCLUDE USING gist` na `time_slots`

`supabase/migrations/20260516000001_initial_schema.sql:281-285` — implementuje twardy wymóg spec ("Time slots cannot overlap"). Filtruje po statusach `('hold','confirmed','in_progress')`, więc anulowane sloty zwalniają zakres. Race-condition-safe.

### Configi

- `next.config.js` — `remotePatterns` dla `*.supabase.co`, `lh3.googleusercontent.com`, `platform-lookaside.fbsbx.com` (avatary Google/FB).
- `tailwind.config.ts` — `content` paths obejmują `app`, `components`, `hooks`. Brand color zdefiniowany w `theme.extend.colors.brand` (używany w `landing` i `login`).
- `postcss.config.js` — `tailwindcss` + `autoprefixer`, prosto.
- `globals.css` — `@tailwind base/components/utilities`, CSS vars dla light/dark, Inter font fallback.
- `.gitignore` — `.env*.local`, `.next`, `node_modules`, `.vercel`, `*.tsbuildinfo` — kompletny.
- `.env.example` — wszystkie wymagane klucze (Supabase, P24, Mapbox, OpenAI, APP_URL).

### Edge Function stuby — semantycznie wskazują na właściwe odpowiedzialności

Komentarze w `ai-intent-recognition`, `slot-finder`, `tracking-broadcast`, `przelewy24-webhook` poprawnie opisują pipeline'y zgodnie z `docs/api/01_endpoints.md` i `docs/architecture/04_realtime_tracking.md`. Sam kod to `return { todo: ... }` — to OK na tym etapie, ale patrz #6 (decyzja vs Next routes).

### `auth.users` cascade

`users.id REFERENCES auth.users(id) ON DELETE CASCADE` — usunięcie z auth schema usuwa profil. RODO grace period zrobione przez `deleted_at` (soft delete) niezależnie.

---

## Priorytetowa lista TODO

**✅ Przed pierwszym `INSERT INTO orders` — ZROBIONE 2026-05-23:**
- ~~Migracja z `handle_new_user` trigger (#1)~~ → `20260523000001_phase1_fixes.sql`
- ~~Fix RLS na `time_slots` insert (#2)~~ → DROP POLICY w migracji 2305
- ~~Fix `jokusor_serves_address` (#3)~~ → ST_Covers w migracji 2305
- ~~Dodaj `events_insert_resident_create` policy (#4)~~ → migracja 2305
- ~~Regeneruj `database.ts` (#5)~~ → permissive stub; realny `supabase gen types` jako komentarz w pliku

**Przed pierwszym Server Action / route handler w Fazie 1:**
1. Wybierz: Edge Function czy Next route dla webhook + tracking (#6)
2. Konfig ESLint (#12)
3. Usuń duplikat seedu w migracji 03 (#7)

**Sprzątanie kosmetyczne — kiedyś:**
4. `tsconfig` `jsx: preserve` (#8)
5. try/catch w middleware (#9)
6. Obsługa błędów `signInWithOAuth` (#10)
7. Wykluczenie `/api/webhooks/*` z matchera (#11)
8. Popraw `package.json.description` i wzmiankę o `middleware.ts` w CLAUDE.md (#13, #14)

---

## Co świadomie pominięto

- **RLS deep-audit** — Faza 6 wg spec. Tu sprawdziłem tylko najgorętsze polityki (`time_slots`, `order_events`, `is_admin`).
- **Bezpieczeństwo OAuth state/PKCE** — Supabase JS robi to wewnętrznie (PKCE), nie ma sensu rewrite.
- **Performance / bundle size** — nic nie chodzi jeszcze.
- **UI / accessibility** — Faza 6.
- **Test infra** — Faza 6.
- **Webhook signature verification** — Edge Function jeszcze nie zaimplementowany, weryfikuję jak będzie kod.
