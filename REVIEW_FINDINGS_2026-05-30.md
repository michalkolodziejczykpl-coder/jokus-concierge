# REVIEW_FINDINGS_2026-05-30.md — security review Fazy 1

Wynik review przeprowadzonego wg promptu z `REVIEW_BRIEF.md`. Skupienie:
poprawność i bezpieczeństwo, nie styl. Zakres: stan repo na 2026-05-30
(commit `f5db67c`), wszystkie nowe route handlery + nowe migracje SQL +
client-side komponenty czatu.

## TL;DR

Phase 1 jest **dobrze zabezpieczona w pierwszej warstwie** — każdy nowy
endpoint waliduje sesję serwerowo, używa Zod, większość wrażliwych operacji
chodzi przez `SECURITY DEFINER` z `auth.uid()` i ustawionym `search_path`.
Service role jest poprzedzony `users.role==='admin'` i nigdy nie idzie do
klienta. Eskalacja roli przez `users_update_own` poprawnie zablokowana.

Znalazłem **5 must-fixów** (3 code-only — naprawione w tej sesji, 2 wymagają
nowej migracji SQL — opisane niżej, do wgrania ręcznego w Supabase) oraz
6 nice-to-have.

## Co zostało naprawione w tej sesji (commit obecny)

| #          | Plik                                        | Zmiana                                                                                                    |
| ---------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| code-fix 1 | `src/app/api/jokusor/apply/route.ts`        | Walidacja, że `background_check_url` i `insurance_doc_url` zaczynają się od `${user.id}/`.                |
| code-fix 2 | `src/app/api/marketplace/messages/route.ts` | Sprzedawca może pisać tylko do tych, którzy do niego napisali; każdy inny może pisać tylko do sprzedawcy. |
| code-fix 3 | `src/app/api/jokusor/profile/route.ts`      | `public_photo_url` musi być publicznym URL-em z bucketa `jokusor-photos` pod folderem `${user.id}/`.      |

Zweryfikowane przez `npm run typecheck` + `npm run build` (oba zielone).

## Co zostało do wgrania ręcznie (SQL — wymaga decyzji)

### Must-fix #4 — `jokusors_update_own` bez `WITH CHECK`

**Problem.** Polityka jest `FOR UPDATE USING (user_id = auth.uid())` bez
`WITH CHECK`. PostgreSQL kopiuje USING do WITH CHECK, czyli efektywnie
"modyfikuj tylko swój wiersz" — ale **wszystkie kolumny tego wiersza są
dozwolone**. Aplikant z `onboarding_status='documents_review'` może
bezpośrednio przez Supabase JS klient:

```sql
update jokusors set is_active = true, onboarding_status = 'approved'
where user_id = auth.uid();
```

To nie eskaluje do `users.role='jokusor'` (admin endpoint robi flip
service-role-em), więc aplikacja nie myśli, że to jokusor. Ale wiersz
pojawi się w `jokusors_read_active` (`USING (is_active)`), więc aplikant
może udawać aktywnego jokusora w listach publicznych i wpisywać się do
`jokusor_modules`.

**Migracja do wklejenia w Supabase SQL Editor:**

```sql
-- 20260530000005_jokusors_update_own_with_check.sql
-- Without this, an applicant could flip is_active/onboarding_status on
-- their own jokusors row and surface as an active jokusor in public lists.
-- The flip should only happen through the admin approve endpoint (service role).

drop policy if exists "jokusors_update_own" on jokusors;
create policy "jokusors_update_own" on jokusors
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and is_active is not distinct from (
      select j.is_active from jokusors j where j.user_id = auth.uid()
    )
    and onboarding_status is not distinct from (
      select j.onboarding_status from jokusors j where j.user_id = auth.uid()
    )
  );
```

(Alternatywnie: `BEFORE UPDATE` trigger blokujący zmianę tych kolumn dla
nie-adminów. Migracja powyżej jest prostsza i wystarczająca.)

### Must-fix #5 — mock-payments otwarte dla każdego

**Problem.** `mock_pay_order` i `/api/orders/[id]/tip` z `payment_method='mock'`
pozwalają każdej zalogowanej osobie oznaczyć swoje zlecenie jako opłacone bez
realnego przelewu. To **nie jest błąd w kodzie** (świadomy kompromis do
sprintu 3c), tylko ryzyko operacyjne.

**Mitygacja — wybierz jedno:**

- Trzymać rejestrację za invite-codem do czasu Przelewy24.
- Albo dodać gate w `mock_pay_order` (sprawdzić `users.role IN ('admin','tester')`).
- Albo zaakceptować ryzyko, jeśli produkcja na razie jest "zamknięta dla zaproszonych".

Nie wymaga migracji jeśli wybierzesz invite-code/zaakceptujesz.

## Nice-to-have (do rozważenia, nie blokujące)

### NTH-1 — `marketplace_reports` z dedupe per-user

`report_listing` świadomie nie ma dedupe. Trzy alt-konta = listing trafia do
moderacji. Migracja:

```sql
-- 20260531000001_marketplace_reports.sql
create table if not exists marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace_listings(id) on delete cascade,
  reporter_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (listing_id, reporter_id)
);

alter table marketplace_reports enable row level security;

create policy "reports_insert_self" on marketplace_reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_read_admin" on marketplace_reports
  for select using (is_admin());

-- Zmień report_listing: najpierw insert do tabeli (ON CONFLICT DO NOTHING),
-- jeśli FOUND=0 — error 'already_reported', jeśli FOUND=1 bump reports_count.
```

### NTH-2 — DELETE-own na bucketach `jokusor-documents` i `jokusor-photos`

Obecnie jokusor nie może usunąć ani wymienić własnego pliku. Drobiazg, ale
warto:

```sql
create policy "jokusor_docs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'jokusor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "jokusor_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'jokusor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

### NTH-3 — UI flag dla mock-tipów

Tip o `payment_method='mock'` traktować w UI jokusora jako "DEMO" lub
filtrować ze statystyk earnings, żeby jokusor nie zgłosił się po wypłatę.
Kosmetyka — do zrobienia gdy będzie panel earnings.

### NTH-4 — zunifikować `requireAdmin()` w endpointach admina

`/api/admin/jokusors/[userId]/approve` ma `requireAdmin()`, reject ma inline.
Wyciągnąć do `src/lib/auth/guards.ts`.

### NTH-5 — Zod schema dla `order_messages` w `validators.ts`

Inline `z.object({content})` w `src/app/api/orders/[id]/messages/route.ts`.
Drobiazg, ale spójność.

### NTH-6 — review prawniczy stron prawnych

`/regulamin`, `/cookies`, `/privacy`, `/data-deletion` to draft. Spec mówi
że trzeba zlecić prawnikowi przed publicznym launchem.

## Pełne wyniki review per punkt z briefu

### 1. RLS / autoryzacja

| Endpoint                                             | Status          | Notatka                                                       |
| ---------------------------------------------------- | --------------- | ------------------------------------------------------------- |
| `POST /api/marketplace/listings`                     | ✓               | seller_id + estate_id serwerowo.                              |
| `PATCH/DELETE /api/marketplace/listings/[id]`        | ✓               | Defense-in-depth `.eq(seller_id)` + RLS.                      |
| `POST /api/marketplace/listings/[id]/buy`            | ✓               | Cała logika w `create_marketplace_purchase`.                  |
| `POST /api/marketplace/listings/[id]/report`         | ✓               | Brak dedupe = NTH-1.                                          |
| `POST /api/marketplace/messages`                     | ✓ po code-fix 2 | Wcześniej każdy mógł DM-ować dowolnego usera.                 |
| `POST /api/orders/[id]/messages`                     | ✓               | Recipient liczony serwerowo z `orders.{resident,jokusor}_id`. |
| `POST /api/orders/[id]/rating`                       | ✓               | Wszystkie warunki + duplicate via 23505.                      |
| `POST /api/orders/[id]/tip`                          | ✓ (mock)        | Mock-payment, patrz must-fix #5.                              |
| `POST /api/jokusor/apply`                            | ✓ po code-fix 1 | Wcześniej można było wysłać cudzą ścieżkę dokumentu.          |
| `PATCH /api/jokusor/profile`                         | ✓ po code-fix 3 | Wcześniej `public_photo_url` mógł być dowolnym URL-em.        |
| `PATCH /api/profile`                                 | ✓               | RLS + Zod + scope po `user_id`/`is_default`.                  |
| `POST /api/admin/jokusors/[userId]/{approve,reject}` | ✓               | UUID + role check przed service-role.                         |

### 2. Service role

Cztery miejsca: `lib/supabase/admin.ts` (definicja), `(admin)/jokusors/page.tsx`,
`api/admin/jokusors/[userId]/approve`, `api/admin/jokusors/[userId]/reject`.
Wszystkie serwerowe, wszystkie gate-owane na `users.role='admin'`. Klucz nie
ma prefiksu `NEXT_PUBLIC_`. ✓

### 3. Eskalacja uprawnień

- `users_update_own` — WITH CHECK z `current_role_id()` ✓
- `jokusors_insert_own` — utwardzone (is_active=false + onboarding_status whitelist) ✓
- `jokusors_update_own` — **must-fix #4** (patrz wyżej)

Resident nie może zostać adminem ani jokusorem przez czysty SQL. ✓

### 4. Storage

- `jokusor-documents` (prywatny): INSERT-own + SELECT-own ✓. DELETE-own brak (NTH-2).
- `jokusor-photos` (publiczny): INSERT-own + UPDATE-own ✓. DELETE-own brak (NTH-2).
- Ścieżki egzekwowane przez `(storage.foldername(name))[1] = auth.uid()::text`. ✓
- Walidacja po stronie handlera, że klient nie podstawia cudzej ścieżki w
  JSON-ie — **załatwione code-fix 1 i 3**.

### 5. `report_listing` SECURITY DEFINER

`search_path=public` ✓, `auth.uid()` check ✓, `SELECT ... FOR UPDATE` ✓,
`cannot_report_own` ✓, brak SQL injection ✓. Brak dedupe to świadomy
kompromis → NTH-1.

### 6. Mock-payments

`mock_pay_order` i `/tip` jednoznacznie oznaczone w SQL i kodzie. Nigdzie w
aplikacji nie zakładamy "real money". Ryzyko operacyjne → must-fix #5.

### 7. Realtime / czat

`OrderChat`: `.eq('order_id', id)`, RLS filtruje do uczestników. ✓
`Conversation`: `.or(and(s,r),and(r,s))` z meId/otherId — RLS i tak filtruje.
Inbox: `.or(sender.eq.X, recipient.eq.X)` z `user.id` z serwera, RLS dodatkowo
filtruje. Niemożliwy wyciek cudzych wiadomości. ✓

Tracking: broadcast-only (zero zapisu do bazy poza checkpointami w
`order_events`). Zgodne ze specem RODO. ✓

### 8. Next 16 async APIs

`cookies()` awaited w `lib/supabase/server.ts` ✓. Wszystkie dynamiczne
route handlery: `type RouteContext = { params: Promise<{...}> }`, robią
`const { x } = await params` ✓. Server components z `searchParams`/`params`
też awaited ✓. `/profile` poza grupami (`src/app/profile/`) — celowe, branchuje
po roli. Brak kolizji tras. ✓

### 9. Top 5 ryzyk + mitygacje

1. **Mock-payments otwarte dla każdego.** → must-fix #5.
2. **`jokusors_update_own` bez WITH CHECK + ścieżki dokumentów.** → must-fix #4 (SQL) + code-fix 1 (zrobione).
3. **Marketplace DM do dowolnego usera.** → **zrobione** (code-fix 2).
4. **`report_listing` bez dedupe.** → NTH-1.
5. **Strony prawne to draft.** → NTH-6.

## Co dalej

Sugerowana kolejność:

1. (najszybsze) Wgrać migrację z must-fix #4 ręcznie w Supabase SQL Editor.
2. Zdecydować jak gate-ować mock-paymenty (invite-only vs role-check) — must-fix #5.
3. NTH-1 (`marketplace_reports`) zanim marketplace będzie dostępny szerszej publice.
4. Reszta NTH-2..6 w wolnej chwili.

Po wgraniu must-fix #4 cała must-lista jest zaadresowana. Wtedy update do
`REVIEW_BRIEF.md` że Faza 1 jest gotowa na zewnętrzną walidację (poza
prawnikiem).
