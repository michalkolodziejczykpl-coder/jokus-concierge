# Zadanie dla Claude Code: SMS OTP przez SMSAPI.pl (Supabase Send SMS Hook)

Cel: dostarczać kody SMS do rejestracji (telefon, krok 3 z `CLAUDE_CODE_TASK_rejestracja.md`)
przez **SMSAPI.pl** zamiast Twilio. Supabase nie ma SMSAPI jako natywnego dostawcy, więc używamy
mechanizmu **Send SMS Hook**: Supabase przy każdej próbie wysłania OTP woła nasz endpoint, a my
w nim wysyłamy SMS przez API SMSAPI.pl.

WAŻNE: kod aplikacji (signInWithOtp / updateUser({ phone }) / verifyOtp) **nie zmienia się**.
Zmieniamy tylko sposób wysyłki SMS po stronie Supabase. Zweryfikuj aktualne szczegóły w
dokumentacji (linki niżej) — payload i podpis hooka oraz endpoint SMSAPI mogły się zmienić.

## Architektura

1. Supabase Auth potrzebuje wysłać SMS (rejestracja telefonu) → wywołuje **Send SMS Hook**
   (HTTP POST) na URL naszej funkcji Edge.
2. Funkcja Edge (`supabase/functions/send-sms/index.ts`, Deno):
   - **weryfikuje podpis** żądania (Standard Webhooks; sekret hooka z Supabase),
   - parsuje payload → numer telefonu + kod OTP,
   - wysyła SMS przez **SMSAPI.pl REST**,
   - zwraca 200 (lub błąd przy niepowodzeniu).

## Do zrobienia (kod)

Utwórz `supabase/functions/send-sms/index.ts`:

- Odczytaj sekret hooka z env `SEND_SMS_HOOK_SECRET` i zweryfikuj podpis przychodzącego
  żądania zgodnie z dokumentacją Supabase Send SMS Hook (Standard Webhooks — nagłówki
  `webhook-id`, `webhook-timestamp`, `webhook-signature`). Odrzuć (401) przy złym podpisie.
- Payload (potwierdź w docs): zawiera obiekt `user` i `sms` z numerem oraz `otp`. Wyciągnij
  telefon (E.164, np. `+48...`) i `otp`.
- Treść SMS po polsku, np.: `Twój kod JOKUS: {otp}. Ważny 10 minut. Nie udostępniaj go nikomu.`
- Wyślij przez SMSAPI.pl REST:
  - Endpoint: `https://api.smsapi.pl/sms.do`
  - Autoryzacja: nagłówek `Authorization: Bearer ${SMSAPI_TOKEN}` (token OAuth z panelu SMSAPI).
  - Parametry (potwierdź w docs SMSAPI): `to` = numer (bez znaku `+`, format `48XXXXXXXXX`),
    `message` = treść, `from` = `${SMSAPI_SENDER}` (zatwierdzone pole nadawcy; jeśli brak
    zatwierdzonego — użyj nadawcy „Test"/eco wg konta), `format=json`, `encoding=utf-8`.
  - Sprawdź odpowiedź; przy błędzie SMSAPI zwróć 500 z treścią błędu (i zaloguj).
- Sekrety funkcji (NIE commituj): `SMSAPI_TOKEN`, `SMSAPI_SENDER`, `SEND_SMS_HOOK_SECRET`.

Dodaj krótkie README w `supabase/functions/send-sms/README.md` z krokami wdrożenia (poniżej).

## Kroki po stronie właściciela (Michał) — opisz je w README

1. Token SMSAPI: panel SMSAPI.pl → API → wygeneruj token (OAuth) → to `SMSAPI_TOKEN`.
   Pole nadawcy: dodaj/zatwierdź nadpis „JOKUS" (lub użyj domyślnego) → to `SMSAPI_SENDER`.
2. Wdróż funkcję: `supabase functions deploy send-sms --no-verify-jwt`
   (hook woła ją z własnym podpisem, nie z JWT użytkownika).
3. Ustaw sekrety:
   `supabase secrets set SMSAPI_TOKEN=... SMSAPI_SENDER=JOKUS`
   (sekret hooka `SEND_SMS_HOOK_SECRET` pojawi się po włączeniu hooka — patrz krok 4 — i też go ustaw).
4. Włącz hook: Supabase Dashboard → Authentication → Hooks → **Send SMS hook** → wskaż URL
   funkcji `https://<projekt>.supabase.co/functions/v1/send-sms`, skopiuj wygenerowany **secret**
   i ustaw go jako `SEND_SMS_HOOK_SECRET` (krok 3), redeploy funkcji jeśli trzeba.
5. W aplikacji ustaw env `PHONE_OTP_ENABLED=true` (Vercel) i zrób redeploy — wtedy krok 3
   rejestracji wyśle prawdziwy kod.

## Dokumentacja do potwierdzenia szczegółów

- Supabase Send SMS Hook: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- Supabase Phone Login (przepływ OTP): https://supabase.com/docs/guides/auth/phone-login
- SMSAPI.pl REST (wysyłka, token, pole nadawcy): https://www.smsapi.pl/docs

## Weryfikacja

1. `npm run typecheck` (funkcja Edge to Deno — nie wchodzi w build Next, ale sprawdź, że nic w
   aplikacji się nie zmieniło i build przechodzi).
2. Test end-to-end: rejestracja e-mailem → uzupełnij → podaj swój numer → na telefon przychodzi
   SMS z kodem JOKUS → wpisz kod → `phone_verified` ustawione (serwerowo) → wejście do aplikacji.
3. Zły podpis hooka → funkcja zwraca 401 (nie wysyła SMS).

## Nie ruszać

- Kodu rejestracji/logowania (signInWithOtp, updateUser, verifyOtp, confirm-phone) — zostaje.
- Google OAuth, PasswordLogin, wewnętrznych nazw (`migmig-concierge`, `migmig_*`).
