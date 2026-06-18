# Zadanie dla Claude Code — konta e-mail+hasło, logowanie, reset i zmiana hasła

## Decyzja produktowa (właściciel)

Konta zakładane e-mailem mają używać **e-maila + hasła**. Numer telefonu jest
**obowiązkowy** (kontakt przy usługach concierge) i potwierdzany **kodem SMS tylko raz** —
przy pierwszym logowaniu, na etapie uzupełniania danych. Reset i zmiana hasła dotyczą
**wyłącznie** użytkowników e-mailowych. Użytkownicy Google/Facebook nie mają hasła i nie
widzą opcji resetu/zmiany.

## Co NIE zmieniamy (ważne)

- **Weryfikacja telefonu SMS** (`/rejestracja/uzupelnij`, `RegisterCompleteForm`,
  `/api/register/profile`, `/api/register/confirm-phone`, Edge Function `send-sms`,
  Send SMS Hook) — **zostaje bez zmian**. To wciąż drugi etap przy pierwszym logowaniu.
- Bramka w `(resident)/home/page.tsx`: niezweryfikowani (`phone_verified !== true`,
  poza adminem) → `/rejestracja/uzupelnij`. **Zostaje** — to ona kieruje świeże konta do
  uzupełnienia telefonu.
- `src/app/(auth)/callback/route.ts` — już obsługuje `token_hash` + `type` (`verifyOtp`).
  `type=email` (potwierdzenie konta) i `type=recovery` (reset) zadziałają bez zmian. **Nie dotykać.**

## Zakres zmian

### 1. Rejestracja: e-mail + hasło zamiast magic link

Zastąp `MagicLinkRegister` nowym `src/components/shared/EmailPasswordRegister.tsx`:

- pola: e-mail, hasło (i „powtórz hasło");
- walidacja Zod: nowy `passwordSchema` w `lib/utils/validators.ts` (min. 8 znaków);
  zgodność obu pól sprawdź po stronie klienta;
- `supabase.auth.signUp({ email, password, options: { emailRedirectTo: \`${origin}/callback?next=/home\` } })`
(`origin`z`window.location.origin`);
- **jeśli** potwierdzanie e-maila jest włączone (domyślnie tak) → po sukcesie komunikat
  „Sprawdź skrzynkę — potwierdź adres, aby dokończyć zakładanie konta.";
- **jeśli** wyłączone → `signUp` zwróci od razu sesję → `router.push('/home')`
  (bramka wyśle na `/rejestracja/uzupelnij`). Obsłuż oba przypadki (sprawdź, czy
  `data.session` istnieje).

`src/app/(auth)/register/page.tsx`:

- użyj `<EmailPasswordRegister />` zamiast `<MagicLinkRegister />`;
- nagłówek/podtytuł poprawiony, np.: „Załóż konto JOKUS — przez Google albo e-mailem i
  hasłem. Numer telefonu potwierdzisz przy pierwszym logowaniu.";
- `<OAuthButtons />` (Google) zostaje.
- `MagicLinkRegister.tsx` można usunąć (nieużywany).

### 2. Logowanie: e-mail + hasło jako główna metoda

`src/app/(auth)/login/page.tsx`:

- nagłówek **prawdziwy**, np. podtytuł „Wejdź przez Google albo e-mailem i hasłem.";
- `<OAuthButtons />` (Google);
- separator „lub";
- `<PasswordLogin />` (istnieje) — teraz pokazany wprost, nie chowany;
- pod formularzem link „Nie pamiętasz hasła?" → `/reset-haslo`;
- stopka „Nie masz konta? Zarejestruj się" → `/register`.

### 3. Odzyskiwanie hasła

`src/app/(auth)/reset-haslo/page.tsx` + `ResetPasswordRequest.tsx`:

- pole e-mail + „Wyślij link do zmiany hasła";
- `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${origin}/callback?next=/reset-haslo/nowe\` })`;
- komunikat **neutralny** (nie ujawniaj, czy konto istnieje): „Jeśli konto istnieje,
  wysłaliśmy link do zmiany hasła.".

`src/app/(auth)/reset-haslo/nowe/page.tsx` + `SetNewPassword.tsx`:

- wymaga aktywnej sesji (ustawia ją `/callback` po kliknięciu linku recovery); jeśli brak
  → komunikat „Link wygasł lub jest nieprawidłowy" + link do `/reset-haslo`;
- pola „Nowe hasło" + „Powtórz hasło", walidacja `passwordSchema`;
- `supabase.auth.updateUser({ password })`; sukces → `router.push('/home')` + `router.refresh()`.

### 4. Zmiana hasła w profilu — TYLKO dla kont e-mailowych

W profilach (`(resident)/profile` i `(jokusor)/profile`) dodaj sekcję „Zmiana hasła":

- **pokazuj ją tylko, gdy użytkownik ma tożsamość e-mail/hasło**, tj.
  `user.identities?.some((i) => i.provider === 'email')` (albo `app_metadata.providers`
  zawiera `'email'`). Dla kont wyłącznie Google/Facebook sekcja jest ukryta;
  ewentualnie pokaż notkę „Logujesz się przez Google — hasłem zarządzasz w koncie Google.";
- komponent `ChangePassword.tsx`: „Nowe hasło" + „Powtórz hasło" → `updateUser({ password })`;
  walidacja `passwordSchema`; po sukcesie komunikat „Hasło zmienione.".
- Jeśli profil mieszkańca i jokusora współdzielą layout — wstaw jeden wspólny komponent.

## Zmiany w panelu Supabase (robi właściciel, NIE Claude Code)

1. **Authentication → Sign In / Providers → Email** — upewnij się, że włączone jest
   logowanie e-mail+hasło. „Confirm email" zostaw **włączone** (zalecane: weryfikuje
   adres). Jeśli wolisz zero kliknięcia w mailu przy rejestracji — można je wyłączyć i
   flow nadal działa (signUp od razu daje sesję); to świadomy wybór bezpieczeństwo vs. wygoda.
2. **Authentication → Emails → Confirm signup** — ustaw link na:
   ```
   {{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&type=email&next=/home
   ```
3. **Authentication → Emails → Reset Password** — ustaw link na:
   ```
   {{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-haslo/nowe
   ```
4. Szablon **Magic Link** nie jest już używany (rejestracja przeszła na hasło) — można go
   zostawić bez zmian.

## Uwagi techniczne

- Next 16: `cookies()`/`getUser()` async — `await` wszędzie w komponentach serwerowych.
- Strony `(auth)/*` są publiczne. `(*)/profile` wymaga zalogowania (jak dziś).
- UI po polsku, kod/komentarze po angielsku; 2 spacje, single quotes, brak trailing comma.
- Komunikaty resetu/logowania **neutralne** (nie zdradzać istnienia konta).
- Numer telefonu pozostaje wymagany w `/rejestracja/uzupelnij` — nie luzować.

## Bramka jakości przed commitem

```
npm run typecheck
npm run format
```

Potem commit + push na `main`.
