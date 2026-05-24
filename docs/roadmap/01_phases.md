# Roadmap — fazy rozwoju

## Faza 0: Setup techniczny (1-2 tygodnie)

**Cel:** mieć działający szkielet, na którym można budować.

### Zadania

- [ ] Cowork generuje strukturę projektu (na podstawie tego pakietu)
- [ ] Założenie projektu Supabase (Frankfurt)
- [ ] Wykonanie `01_schema.sql` + `02_rls_policies.sql`
- [ ] Konfiguracja OAuth providers (Google, Facebook — Apple później)
- [ ] Założenie kont: Mapbox, OpenAI, Przelewy24 (sandbox), Sentry
- [ ] Domeny migmig.pl, migmig.com.pl — DNS na Vercel
- [ ] Konfiguracja CI (GitHub Actions: lint, typecheck)
- [ ] First deploy do Vercel (preview environment)
- [ ] Konfiguracja PostHog na Cyberfolks VPS

### Definition of Done

- Aplikacja deploy'uje się na migmig.pl
- Można się zalogować przez Google
- Po zalogowaniu pojawia się ekran "Hello, [imię]"
- Baza ma seed'owane moduły
- Lint, typecheck, build → wszystko zielone

## Faza 1: MVP mieszkańca (6-8 tygodni)

**Cel:** mieszkaniec może zamówić usługę i ją otrzymać. Bez marketplace, bez professional, bez głosu.

### Sprint 1.1 — Onboarding (1 tydzień)

- [ ] OAuth flow (Google + Facebook + Email magic link)
- [ ] Ekran wyboru adresu (Mapbox autocomplete)
- [ ] Walidacja: czy adres w obsługiwanym osiedlu
- [ ] Out-of-range screen + email do listy oczekujących

### Sprint 1.2 — Ekran główny + moduły (2 tygodnie)

- [ ] Komponent `<ModuleTile>`
- [ ] Server Component pobierający aktywne moduły dla adresu mieszkańca
- [ ] Formularz modułu (dynamiczne renderowanie z `custom_fields`)
- [ ] Wybór slotu czasu (`/api/slots/available`)
- [ ] Algorytm wyszukiwania slotów (Edge Function)

### Sprint 1.3 — Płatności + zamówienia (2 tygodnie)

- [ ] Integracja Przelewy24 (BLIK + karty)
- [ ] Sesja płatności + redirect
- [ ] Webhook handler
- [ ] Zmiana statusu zamówienia
- [ ] Push notifications (Web Push)
- [ ] Ekran listy zamówień
- [ ] Ekran szczegółów zamówienia (bez mapy live na razie)

### Sprint 1.4 — Czat + statusy (1 tydzień)

- [ ] Chat panel (Supabase Realtime)
- [ ] Statusy zamówienia + timeline
- [ ] Powiadomienia push przy zmianie statusu

### Sprint 1.5 — Ocena + napiwek + profil (1 tydzień)

- [ ] Ekran oceny po zakończeniu
- [ ] Napiwek (BLIK / karta)
- [ ] Profil użytkownika
- [ ] Zarządzanie adresami

### Definition of Done

Mieszkaniec może:

- Zarejestrować się przez Google
- Dodać adres
- Zobaczyć kafelki modułów
- Zamówić wyprowadzenie psa (lub inny moduł)
- Zapłacić BLIK
- Widzieć status zamówienia
- Otrzymywać powiadomienia push
- Ocenić jokusora po zakończeniu

## Faza 2: MVP jokusora (3-4 tygodnie)

**Cel:** jokusor może odbierać i realizować zlecenia.

### Sprint 2.1 — Onboarding jokusora (1 tydzień)

- [ ] Formularz aplikacyjny (`/franchise`)
- [ ] Panel admina: lista wniosków
- [ ] Akceptacja → utworzenie rekordu jokusora
- [ ] Pierwsze logowanie z rolą jokusora

### Sprint 2.2 — Dashboard + zlecenia (1 tydzień)

- [ ] Dashboard dnia
- [ ] Lista zleceń (pending / in_progress / completed)
- [ ] Akcje: akceptuj / odrzuć / rozpocznij / zakończ
- [ ] Checkpoint events

### Sprint 2.3 — Zasięg + kalendarz (1 tydzień)

- [ ] Ekran service-area (3 zakładki: mapa / kody / ulice)
- [ ] Rysowanie polygonu (Mapbox GL Draw)
- [ ] Ustawianie godzin pracy
- [ ] Urlop (od-do)

### Sprint 2.4 — Statystyki + zarobki (1 tydzień)

- [ ] Ekran zarobków
- [ ] Faktury miesięczne (PDF generation)
- [ ] Ranking osiedla

### Definition of Done

Jokusor może:

- Aplikować jako franczyzobiorca
- Zostać zatwierdzony przez admina
- Logować się jako jokusor
- Definiować swój zasięg
- Akceptować/odrzucać zlecenia
- Realizować zlecenia (z checkpointami)
- Widzieć swoje zarobki

## Faza 3: Live tracking + AI głosowe (3-4 tygodnie)

**Cel:** wprowadzenie kluczowych unique selling points.

### Sprint 3.1 — GPS broadcasting (1 tydzień)

- [ ] Komponent `<GpsTracker>` w aplikacji jokusora
- [ ] Supabase Realtime channel `tracking:order:{id}`
- [ ] Throttling po stronie klienta (haversine check)

### Sprint 3.2 — Live tracking map (1 tydzień)

- [ ] Komponent `<LiveTrackingMap>` w aplikacji mieszkańca
- [ ] Mapbox GL JS + animowany marker
- [ ] Pobieranie trasy z Mapbox Directions API
- [ ] ETA calculation (tryb prosty)
- [ ] RLS policy na kanale realtime

### Sprint 3.3 — Whisper transcription (1 tydzień)

- [ ] Komponent `<VoiceButton>` (FAB) + modal nasłuchiwania
- [ ] Nagrywanie audio w przeglądarce (MediaRecorder API)
- [ ] Endpoint `/api/ai/transcribe` (Whisper)
- [ ] Wyświetlanie transkrypcji + przycisk "potwierdź"

### Sprint 3.4 — Intent recognition (1 tydzień)

- [ ] Tabela `ai_intents` + seed (5-10 intentów na start)
- [ ] Generowanie embeddings (script offline)
- [ ] Funkcja `match_intents` (pgvector)
- [ ] Endpoint `/api/ai/intent`
- [ ] Ekstrakcja parametrów (GPT-4o-mini)
- [ ] Pre-wypełnianie formularza
- [ ] Fallback gdy confidence < 0.75

### Definition of Done

- Mieszkaniec widzi jokusora na mapie podczas drogi
- ETA aktualizuje się co 7s
- Można zamówić wyprowadzenie psa głosem ("wyprowadź Reksia na pół godziny")
- AI pre-wypełnia formularz na podstawie głosu
- Można potwierdzić zamówienie 2 kliknięciami

## Faza 4: Marketplace C2C (3-4 tygodnie)

**Cel:** dodać mini-marketplace z dostawą MIGMIG.

### Sprint 4.1 — Lista i ogłoszenia (1 tydzień)

- [ ] `/marketplace` — lista z filtrami
- [ ] `/marketplace/new` — dodawanie ogłoszenia
- [ ] Upload zdjęć (Supabase Storage)
- [ ] Auto-moderacja AI (klasyfikacja + zakazane przedmioty)

### Sprint 4.2 — Komunikacja + zakup (1 tydzień)

- [ ] Czat między kupującym a sprzedawcą
- [ ] Modal "Kup z dostawą MIGMIG"
- [ ] Wybór slotu dostawy
- [ ] Płatność BLIK + escrow

### Sprint 4.3 — Escrow + finalizacja (1 tydzień)

- [ ] Logika escrow w bazie
- [ ] Powiadomienia: "Twoje pieniądze są zabezpieczone"
- [ ] Inspection deadline 15 min
- [ ] Auto-release pieniędzy
- [ ] Spór: dispute flow

### Sprint 4.4 — Moderacja (1 tydzień)

- [ ] Panel admina: ogłoszenia do akceptacji
- [ ] Reports + auto-flag
- [ ] Lista zakazanych przedmiotów
- [ ] Anti-spam: limit ogłoszeń per user

### Definition of Done

- Mieszkaniec może wystawić ogłoszenie z zdjęciami
- Może kupić ogłoszenie sąsiada z dostawą MIGMIG
- Escrow chroni obie strony
- Auto-moderacja działa
- Admin może rozstrzygać spory

## Faza 5: Moduły professional (2-3 tygodnie)

**Cel:** dodać "przypilnuj fachowca" — najwyżej-marżowy moduł.

### Sprint 5.1 — Baza fachowców (1 tydzień)

- [ ] Tabela `trusted_professionals`
- [ ] Panel admina: onboarding fachowców
- [ ] Weryfikacja dokumentów
- [ ] Lista per kategoria + osiedle

### Sprint 5.2 — Flow zamówienia (1 tydzień)

- [ ] Kafelki "Przypilnuj X" (hydraulik, elektryk, ślusarz, handyman, AGD)
- [ ] Formularz problemu (tekst + zdjęcia)
- [ ] Wybór fachowca (lub "dowolny zaufany")
- [ ] Płatność kaucji za pilnowanie
- [ ] Tryb awarii (mnożnik 1.5x / 2.0x)

### Sprint 5.3 — Realizacja (1 tydzień)

- [ ] Jokusor widzi listę zaufanych fachowców
- [ ] Kontakt telefoniczny w aplikacji
- [ ] Zdjęcia "po naprawie"
- [ ] Upload paragonu/faktury
- [ ] Ocena fachowca po zakończeniu

### Definition of Done

- Mieszkaniec może zamówić "przypilnuj hydraulika"
- Jokusor wybiera fachowca i organizuje naprawę
- Trzy strumienie płatności działają poprawnie
- Po naprawie: ocena jokusora + fachowca

## Faza 6: Polish i skalowanie (4-6 tygodni)

**Cel:** dopracowanie + przygotowanie do skali.

- [ ] PWA optimization (offline mode, install prompt)
- [ ] Push notifications: różne kategorie (zamówienia / marketplace / promocje)
- [ ] Bodycam (opcjonalny dodatek do zleceń)
- [ ] Program poleceń (referral codes)
- [ ] Subskrypcje (cykliczne zamówienia)
- [ ] A/B testing infrastructure (PostHog feature flags)
- [ ] Performance: bundle size, lighthouse scores
- [ ] Accessibility: WCAG AA compliance
- [ ] Internationalization-ready (pl-PL i18n)
- [ ] Comprehensive E2E tests (Playwright)

## Faza 7: React Native (8-12 tygodni)

**Cel:** aplikacje natywne dla Android + iOS, gdy PWA osiągnie 3000 DAU.

### Stack RN

- Expo SDK 51+
- React Native 0.74+
- TypeScript
- TanStack Query (jak w PWA)
- Współdzielone z PWA: `lib/types`, `lib/validators`, API endpointy

### Co się NIE zmienia

- Backend (Supabase + Edge Functions)
- Schemat bazy
- Logika biznesowa
- Routing (Expo Router ma tę samą filozofię co Next.js App Router)

### Co się zmienia

- UI komponenty (RN zamiast HTML)
- Native modules: location, push, biometrics
- Build process (EAS Build)
- Store deployment (App Store, Google Play)

## Mapa decyzji — kiedy następna faza?

| Trigger                | Następna faza                                                 |
| ---------------------- | ------------------------------------------------------------- |
| Faza 0 ukończona       | Start Faza 1                                                  |
| Faza 1 ukończona       | Faza 2 (równolegle: pierwsi jokusorzy onboardowani manualnie) |
| 5 aktywnych jokusorów  | Faza 3                                                        |
| 20 aktywnych jokusorów | Faza 4 (marketplace ma sens przy gęstości)                    |
| 100 zleceń / dzień     | Faza 5                                                        |
| 1000 DAU               | Faza 6 (polish staje się ważniejsza niż features)             |
| 3000 DAU               | Faza 7 (RN)                                                   |
| 10000 DAU              | Skalowanie infrastruktury (multi-region, caching, CDN)        |

## Budżet czasowy

Całość MVP do produkcji: **6-10 tygodni** pełnego skupienia (Faza 0-3).

Konserwatywnie: **3-4 miesiące** przy pracy własnej w połowie czasu (Michał równolegle zarządza JOKUS Sp. z o.o.).

Faza 4-6: kolejne **3-4 miesiące**.

Faza 7 (RN): **3-4 miesiące** + okres pracy z App Store.

## Co po roku?

- Multi-city expansion (Warszawa, Kraków, Poznań)
- B2B segment (firmy zamawiające dla pracowników)
- API dla zewnętrznych aplikacji (dev-friendly tier)
- White-label dla deweloperów osiedli (apartamentowiec dla mieszkańców)
- Subskrypcja "MIGMIG Plus" dla power-userów
