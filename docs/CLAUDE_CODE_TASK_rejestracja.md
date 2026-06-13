# Zadanie dla Claude Code: rejestracja e-mailem (magic link) + obowiązkowy telefon (OTP)

Najpierw przeczytaj `CLAUDE.md`. Poniżej dwa powiązane zadania. Pracuj po polsku w UI,
po angielsku w kodzie. Po każdym etapie: `npm run typecheck` i `npm run build` muszą być zielone.

## Kontekst techniczny (stan obecny)

- Next.js 16 (App Router) + Supabase przez `@supabase/ssr`. Klient przeglądarki: `@/lib/supabase/client`, serwer: `@/lib/supabase/server`, service-role: `@/lib/supabase/admin` (tylko serwer, gate `users.role==='admin'`).
- Auth: dotychczas Google OAuth. Niedawno dodano logowanie e-mail+hasło na `/login` (`src/components/shared/PasswordLogin.tsx`, `signInWithPassword`).
- **BŁĄD do naprawienia:** `src/app/(auth)/register/page.tsx` renderuje TYLKO `<OAuthButtons />` (przycisk Google). Brak ścieżki rejestracji e-mailem.
- Tabela `public.users`: kolumny m.in. `id, email, full_name, phone, avatar_url, role, age_verified, oauth_provider`. Trigger `on_auth_user_created` → `public.handle_new_user()` automatycznie tworzy wiersz w `public.users` po każdej rejestracji w `auth.users` (też przy magic link / phone).
- RLS: `users_update_own` pozwala userowi aktualizować WŁASNY wiersz, ale `WITH CHECK` przez `current_role_id()` blokuje zmianę `role`.
- Callback OAuth: `src/app/(auth)/callback/route.ts` — robi `exchangeCodeForSession(code)` i przekierowuje do `?next=` (domyślnie `/home`). Magic link z PKCE też wraca z `?code=`, więc ten callback można użyć ponownie.
- Onboarding adresu: `/onboarding/address` + `POST /api/onboarding/address` (Zod `addressInputSchema` w `src/lib/utils/validators.ts`). `/home` przekierowuje do onboardingu, jeśli brak adresu domyślnego.
- Redirect URLs w Supabase już zawierają `https://jokus.pl/**` i `https://www.jokus.pl/**`.

## ZADANIE 1 — naprawić `/register` (ścieżka e-mail)

Rejestracja e-mailem ma być **bezhasłowa, na magic link** (patrz Zadanie 2 krok 1). Czyli `/register`:

- Zostaw przycisk Google (`<OAuthButtons />`).
- Dodaj pod nim formularz: pole **e-mail** + przycisk „Wyślij link aktywacyjny". Po wysłaniu pokaż komunikat „Sprawdź skrzynkę — wysłaliśmy link aktywacyjny na {email}".
- Zaktualizuj nagłówek/copy (teraz kłamie „Jeden klik").

## ZADANIE 2 — pełny przepływ rejestracji e-mailem

Docelowy flow (zgodnie z wymaganiem właściciela):

1. **Krok 1 — e-mail → link.** Na `/register` użytkownik podaje tylko e-mail. Wywołaj:

   ```ts
   supabase.auth.signInWithOtp({
     email,
     options: {
       shouldCreateUser: true,
       emailRedirectTo: `${window.location.origin}/callback?next=/rejestracja/uzupelnij`
     }
   });
   ```

   To wysyła magic link i (po kliknięciu) tworzy konto + sesję, a `/callback` przekieruje na stronę uzupełnienia. Nie zbieramy hasła.
   - Supabase (konfiguracja po stronie właściciela): Authentication → Email — włączone; szablon „Magic Link" aktywny.

2. **Krok 2 — uzupełnienie danych.** Nowa strona `src/app/(auth)/rejestracja/uzupelnij/page.tsx` (URL `/rejestracja/uzupelnij`), wymaga zalogowania:
   - Jeśli `users.phone_verified === true` → redirect `/home` (już po rejestracji).
   - Formularz (client): **imię i nazwisko** (wymagane), **numer telefonu** (wymagany, format PL: `+48` lub 9 cyfr — zwaliduj Zod-em w `validators.ts`, np. `registerProfileSchema`). Opcjonalnie zgoda na regulamin (checkbox) jeśli chcesz.
   - „Dalej" zapisuje imię (PATCH istniejący `/api/profile` lub nowy endpoint) i przechodzi do kroku 3 (weryfikacja telefonu).

3. **Krok 3 — potwierdzenie telefonu kodem (SMS OTP).**
   - Start: `supabase.auth.updateUser({ phone: '+48XXXXXXXXX' })` → Supabase wysyła SMS z kodem.
   - UI: pole na 6-cyfrowy kod + „Potwierdź".
   - Weryfikacja: `supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })`.
   - Po sukcesie: ustaw `users.phone = ...` i `users.phone_verified = true` — patrz „Bezpieczeństwo" niżej.
   - Po potwierdzeniu → redirect `/onboarding/address` (jeśli brak adresu) lub `/home`.

## Migracja SQL (do wgrania w Supabase)

```sql
alter table public.users add column if not exists phone_verified boolean not null default false;
```

(Kolumna `phone` już istnieje.)

## Bezpieczeństwo (WAŻNE)

- `users_update_own` pozwala userowi ustawić własne pola, więc teoretycznie mógłby sam ustawić `phone_verified=true` bez weryfikacji. Dlatego **flip `phone_verified=true` rób w endpointcie serwerowym** (np. `POST /api/register/confirm-phone`), który NAJPIERW potwierdza, że telefon jest faktycznie zweryfikowany w `auth.users` (po `verifyOtp` Supabase ustawia `phone_confirmed_at`). Endpoint odczytuje aktualnego usera (`supabase.auth.getUser()`), sprawdza `user.phone_confirmed_at != null` i dopiero wtedy ustawia `users.phone_verified=true` (+ `phone`). Nie ufaj samemu klientowi.
- Walidacja telefonu Zod-em po stronie serwera.

## Bramkowanie (gating) — decyzja właściciela

Użytkownik bez `phone_verified` powinien być kierowany na `/rejestracja/uzupelnij` zanim użyje aplikacji. Do ustalenia:

- Czy dotyczy to TYLKO rejestracji e-mailem, czy też kont **Google** (które nie mają telefonu)? Domyślnie zaproponuj: każdy zalogowany bez `phone_verified` → redirect na uzupełnienie (czyli także konta Google przejdą raz przez podanie telefonu). Zaimplementuj gate w `/home` (i ewentualnie w `proxy.ts`/guardzie), ale NIE blokuj stron publicznych (`/login`, `/register`, `/regulamin`, `/privacy`, `/cookies`, `/callback`, `/rejestracja/uzupelnij`).
- **Uwaga:** konto testowe dla Przelewy24 (tworzone w panelu Supabase) — albo daj mu od razu `phone_verified=true`, albo zwolnij konta-testowe z gate, żeby P24 nie utknęło na ekranie telefonu.

## Zależność zewnętrzna (koszt + konfiguracja właściciela)

**SMS OTP wymaga dostawcy SMS** skonfigurowanego w Supabase: Authentication → Sign In / Providers → **Phone** → włącz + podaj dane dostawcy (Twilio / MessageBird / Vonage). To kosztuje za każdy SMS i wymaga założenia konta u dostawcy. Bez tego krok 3 nie wyśle kodu. Zaimplementuj flow zakładając Supabase phone OTP; w README zadania dopisz, że właściciel musi skonfigurować dostawcę SMS.

- Jeśli dostawca SMS nie jest jeszcze gotowy: dodaj przełącznik (env `PHONE_OTP_ENABLED`) — gdy wyłączony, krok 3 tymczasowo pomija realny SMS (np. przyjmuje telefon bez kodu) i NIE ustawia `phone_verified` na sztywno; zostaw wyraźny TODO. Domyślnie ma być włączony, gdy dostawca działa.

## Weryfikacja po implementacji

1. `npm run typecheck` + `npm run build` zielone.
2. Ścieżka e-mail: /register → e-mail → link na skrzynkę → klik → /rejestracja/uzupelnij → imię + telefon → kod SMS → /home.
3. Telefon nie do obejścia: spróbuj ustawić `phone_verified` bez kodu (powinno się nie udać — flip tylko serwerowo po `phone_confirmed_at`).
4. Konto Google i konto testowe P24 nadal działają (zgodnie z decyzją o gate).

## Status implementacji + wymagana konfiguracja właściciela

Zaimplementowane (kod + migracja):

- Migracja `supabase/migrations/20260611000001_phone_verified.sql` — `users.phone_verified` (wgraj ręcznie w Supabase SQL Editor).
- `/register`: Google + bezhasłowy magic link (`MagicLinkRegister`), copy zaktualizowane.
- `/rejestracja/uzupelnij`: imię + telefon → SMS OTP → serwerowy flip `phone_verified`.
- API: `POST /api/register/profile` (zapis imienia+telefonu) i `POST /api/register/confirm-phone` (flip `phone_verified` tylko po `phone_confirmed_at`).
- Zod: `plPhoneSchema`, `registerProfileSchema`, `confirmPhoneSchema` w `validators.ts`.
- Gate w `(resident)/home`: każdy zalogowany bez `phone_verified` → `/rejestracja/uzupelnij`. Admin zwolniony.

Właściciel musi skonfigurować po swojej stronie:

1. **Dostawca SMS (wymagany do kroku 3).** Supabase → Authentication → Sign In / Providers → **Phone** → włącz + dane dostawcy (Twilio / MessageBird / Vonage). Każdy SMS kosztuje. Bez tego `updateUser({ phone })` nie wyśle kodu.
   - Dopóki dostawca nie jest gotowy: ustaw env **`PHONE_OTP_ENABLED=false`** (Vercel + `.env.local`). Wtedy krok 3 pomija SMS, zapisuje dane, ale **nie** ustawia `phone_verified` (TODO w `RegisterCompleteForm.tsx`). Domyślnie (brak zmiennej) flow jest WŁĄCZONY.
2. **Magic Link.** Authentication → Email — włączone; szablon „Magic Link" aktywny.
3. **Konto testowe Przelewy24.** Nadaj mu `phone_verified=true` (np. `update public.users set phone_verified=true where email='...';`), żeby gate nie zatrzymał recenzenta P24 na ekranie telefonu.

## Czego nie ruszać

- Logowania Google (`OAuthButtons`, `redirectTo: ${window.location.origin}/callback`) — działa na obu domenach, nie wracaj do stałego APP_URL.
- `PasswordLogin` na `/login` (logowanie e-mail+hasło dla istniejących/testowych kont) — zostaje.
- Wewnętrznych nazw zasobów (`migmig-concierge`, `migmig_*` enum) — zostają.
