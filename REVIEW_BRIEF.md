# REVIEW_BRIEF.md — Brief dla Claude Code (lub innego reviewera)

Ten plik jest dla osoby/agenta robiącego review **Fazy 1** projektu JOKUS Concierge
(dawniej MIGMIG). Zaktualizowany 2026-05-30 — to NIE jest już sam szkielet, w repo
jest działająca logika kilku pionowych funkcji.

## Kontekst — stan na dziś

Stack: Next.js 16 (App Router) + React 19 + TypeScript strict + Supabase (Postgres + Auth + Realtime + Storage). UI po polsku, kod po angielsku. Marka w aplikacji: **JOKUS Concierge** (spółka JOKUS Sp. z o.o., NIP 9131639730). Hosting: Vercel (prod https://www.migmig.pl — domena docelowa jokus.pl jeszcze nieprzepięta).

Zbudowane i wdrożone na prod funkcje (poza oryginalnym scaffoldem):

- **Sprint A — compliance**: `/regulamin`, `/cookies`, `<Footer>` z NIP, baner cookies (tylko niezbędne), checkbox akceptacji + info dla konsumenta przed płatnością (`HoldView`). Strony prawne to DRAFT do recenzji prawnika.
- **Rebrand** MIGMIG → JOKUS w tekstach UI (wewn. wartości `migmig_*` w bazie zostawione celowo).
- **Sprint D-2 — marketplace**: wyszukiwarka + filtry (URL-driven), edycja/usuwanie (soft-delete) własnych ogłoszeń, zgłaszanie (SECURITY DEFINER `report_listing`), czat kupujący↔sprzedawca (`marketplace_messages`).
- **Sprint E — jokusor**: samodzielna rejestracja z uploadem dokumentów (zaświadczenie o niekaralności OBOWIĄZKOWE) do PRYWATNEGO bucketu; panel admina (`/jokusors`) z podpisanymi URL-ami i akceptacją/odrzuceniem; akceptacja zmienia `users.role`→`jokusor` (service role). Edycja profili (mieszkaniec + jokusor) na `/profile`. Publiczne zdjęcie jokusora. Czat jokusor↔klient przy zamówieniu (`order_messages`). Oceny (1-5 + komentarz) i napiwki na zakończonym zleceniu.
- **Sprint 5b — tracking**: mapa Leaflet (z CDN) z pozycją jokusora + mieszkańca, wibracja przy zbliżeniu.

## Migracje SQL do zastosowania (poza repo, w Supabase)

Te migracje są w `supabase/migrations/`, ale część była wgrywana ręcznie w SQL Editorze. Reviewer powinien sprawdzić ich poprawność i RLS:

- `20260530000001_marketplace_report.sql` — `report_listing()` SECURITY DEFINER.
- `20260530000002_jokusor_onboarding.sql` — `jokusors_insert_own` (utwardzone), bucket `jokusor-documents` (prywatny) + polityki storage.
- `20260530000003_order_messages.sql` — tabela + RLS.
- `20260530000004_jokusor_profile_photo.sql` — kolumna + bucket `jokusor-photos` (publiczny).

## Suggested review prompt (skopiuj do Claude Code)

```
Jesteś senior fullstack engineer (Next.js 16 App Router + Supabase RLS) robiącym
security-first code review Fazy 1. Najpierw przeczytaj CLAUDE.md, potem
REVIEW_BRIEF.md. Skup się na poprawności i bezpieczeństwie, nie na stylu.

Zweryfikuj konkretnie:

1. RLS / AUTORYZACJA. Dla każdego nowego route handlera w src/app/api/** sprawdź,
   czy autoryzacja jest egzekwowana po stronie serwera I przez RLS, nie tylko w UI:
   - /api/marketplace/listings/[id] (PATCH/DELETE), /report
   - /api/marketplace/messages
   - /api/orders/[id]/messages, /rating, /tip
   - /api/jokusor/apply, /api/jokusor/profile, /api/profile
   - /api/admin/jokusors/[userId]/approve|reject
   Czy któryś endpoint pozwala działać w cudzym imieniu? Czy walidacja Zod jest
   po stronie serwera?

2. SERVICE ROLE. createAdminClient() (service role, omija RLS) jest używany w
   panelu admina /(admin)/jokusors i w approve/reject. Czy każde takie użycie jest
   poprzedzone sprawdzeniem users.role==='admin'? Czy service role nie wycieka do
   komponentu klienckiego?

3. ESKALACJA UPRAWNIEŃ. Polityka jokusors_insert_own wymusza is_active=false +
   onboarding_status in (pending, documents_review). users_update_own używa
   current_role_id() by zablokować zmianę roli. Czy da się to obejść? Czy mieszkaniec
   może sam zostać jokusorem/adminem?

4. STORAGE. Bucket jokusor-documents jest prywatny (dokumenty wrażliwe, w tym
   zaświadczenie o niekaralności) — czy polityki pozwalają czytać tylko właścicielowi/
   adminowi (przez signed URL)? Bucket jokusor-photos jest publiczny — czy to OK dla
   wizerunku? Czy ścieżki plików są ograniczone do folderu {uid}/?

5. SECURITY DEFINER report_listing — czy bezpieczna (search_path, brak SQL injection,
   blokada zgłaszania własnego)? Brak dedupe per-user to znany kompromis.

6. PŁATNOŚCI-MOCK. Zamówienia (mock_pay_order) i napiwki (/tip → payment_status='paid',
   payment_method='mock') NIE pobierają realnych pieniędzy — Przelewy24 dochodzi w
   sprincie 3c. Sprawdź, czy nigdzie nie zakładamy, że płatność jest prawdziwa, i czy
   te miejsca są wyraźnie oznaczone.

7. REALTIME / CZAT. Marketplace i order chat działają przez polling co 5s + odczyt z
   bazy (RLS uczestnicy). Czy zapytania .or(...)/.eq('order_id') nie ujawniają cudzych
   wiadomości? Tracking to broadcast (bez zapisu do bazy — wymóg RODO).

8. NEXT 16. cookies()/headers()/params/searchParams są async — czy wszędzie await?
   Czy nie ma kolizji tras (np. /profile jest celowo poza grupami ról)?

9. RYZYKA. Wymień 5 największych ryzyk przed launchem + mitygacje.

Format: executive summary (5-10 zdań), potem per punkt ✓/⚠️/❌ z konkretną sugestią,
na końcu lista must-fix → nice-to-have.
```

## Świadome kompromisy (NIE zgłaszaj jako błędy — to znane decyzje)

- Płatności zamówień i napiwki są **mock** do sprintu 3c (Przelewy24 czeka na weryfikację).
- Czat (marketplace + zamówienia) na **pollingu co 5s**, nie Realtime postgres_changes.
- `report_listing` bez dedupe per-user (brak tabeli zgłoszeń) — MVP.
- Kafelki mapy z OpenStreetMap (darmowe) — przy skali zmienić na płatnego dostawcę.
- Strony prawne (regulamin/prywatność/cookies) to **draft do recenzji prawnika**.
- Facebook login **odłożony** do weryfikacji Meta (tylko Google działa).
- `database.ts` to generyczny stub → liczne `as never` przy insertach (znane, REVIEW_REPORT #5).
- Brak testów (roadmap Faza 6).

## Czego NIE rewizować

- Wydajność na skali, SEO/a11y, testy (Faza 6).
- Styl komponentów (chyba że łamie dostępność lub czytelność).

## Po review

Wynik (⚠️ i ❌) jako issues w repo `migmig-concierge` na GitHub. Must-fixy adresujemy przed publicznym launchem (zwłaszcza punkty 1-5: autoryzacja, service role, eskalacja uprawnień, storage).
