# Zadanie dla Claude Code — admin: lista użytkowników + jokusorzy z obszarem

## Cel

Admin musi widzieć w panelu **wszystkich użytkowników** (mieszkańcy, jokusorzy, admini)
oraz — dla jokusorów — **obszar/kody, które obsługują**. Obecny `/jokusors` to tylko
kolejka zgłoszeń do weryfikacji (pending/documents_review) i **zostaje bez zmian**.

Robimy **jeden nowy ekran** `/(admin)/users` z filtrem ról i wyszukiwarką, gdzie wiersze
jokusorów dodatkowo pokazują ich obszar działania.

## Model danych (już istnieje, nie zmieniać schematu)

- `public.users`: `id, full_name, email, phone, role, oauth_provider, created_at, deleted_at`.
  Rola: `resident | jokusor | admin` (enum `user_role`). Pomijaj `deleted_at IS NOT NULL`.
- `public.jokusors`: `user_id, estate_id, service_postal_codes text[], service_streets text[],
service_area geography(POLYGON)`, `business_name, rating, completed_jobs_count, is_active,
onboarding_status`.
- `public.estates`: `id, name, city`.

## Strona `/(admin)/users/page.tsx` (server component)

Wzoruj się na `src/app/(admin)/jokusors/page.tsx` — ten sam wzorzec:

- admin-gate (pobierz `users.role` bieżącego usera, jeśli ≠ `admin` → `redirect('/home')`);
- użyj `createAdminClient()` (service role) do odczytów — strona jest admin-gated, spójnie
  z istniejącym `/jokusors`. **Service role tylko po stronie serwera, nigdy do klienta.**
- defensywne ładowanie: błąd → czytelny komunikat na stronie (jak w `/jokusors`).

Zapytania:

1. `users`: `select id, full_name, email, phone, role, oauth_provider, created_at`
   `is('deleted_at', null)` `order('created_at', desc)`.
2. dla user_id z rolą `jokusor` — `jokusors`:
   `select user_id, estate_id, service_postal_codes, service_streets, service_area,
business_name, rating, completed_jobs_count, is_active, onboarding_status`
   `.in('user_id', jokusorIds)`; zbuduj mapę po `user_id`.
3. `estates`: `select id, name` dla estate_id występujących u jokusorów; mapa po `id`.

`service_area` to polygon — nie renderuj geometrii, tylko flagę „obszar na mapie: tak/nie"
(`service_area != null`).

## Filtr i wyszukiwarka (URL-driven, jak w marketplace)

- query param `?role=` (`all | resident | jokusor | admin`, domyślnie `all`) — filtr po roli;
- query param `?q=` — proste filtrowanie po `full_name`/`email` (może być po stronie serwera
  w zapytaniu: `.or('full_name.ilike.%q%,email.ilike.%q%')`, pamiętaj o sanestyzacji `%`/`,`);
- linki/format filtrów spójne z istniejącym wzorcem URL-driven w marketplace.

## Render

Tabela lub karty (RWD — na mobile karty). Dla każdego usera:

- imię i nazwisko (lub „—"), e‑mail, telefon (lub „—");
- **badge roli** (kolory: resident neutralny, jokusor zielony, admin amber);
- sposób logowania: `oauth_provider` (`google`/`facebook`/`email`) — mała etykieta;
- data dołączenia (`created_at`, format PL).

Dla wierszy **jokusor** dodatkowo blok „Obszar":

- nazwa osiedla (z mapy estates) lub „—";
- `service_postal_codes` → „Kody: 50-001, 50-002 …" (lub „—");
- `service_streets` → „Ulice: …" (jeśli niepuste);
- „Obszar na mapie: tak/nie" (z `service_area`);
- status: `is_active` (Aktywny/Nieaktywny) + `onboarding_status`
  (pending/documents_review/approved/rejected) jako badge;
- `rating` + `completed_jobs_count` („★ 4.8 · 12 zleceń").

## Wpięcie w panel

W `src/app/(admin)/panel/page.tsx` dodaj kafelek **„Użytkownicy"** → `/users`
(obok istniejących: Moduły, Produkty, Osiedla, Zgłoszenia jokusorów). Zachowaj styl
istniejących kafelków.

## Uwagi

- Next 16: `cookies()`/`getUser()` async — `await`.
- UI po polsku, kod po angielsku; 2 spacje, single quotes, brak trailing comma.
- Żadnych zmian w schemacie ani w istniejącym `/jokusors` (kolejka zgłoszeń zostaje).
- Nie eksponuj service-role do komponentu klienckiego.

## Bramka jakości przed commitem

```
npm run typecheck
npm run format
```

Potem commit + push na `main`.
