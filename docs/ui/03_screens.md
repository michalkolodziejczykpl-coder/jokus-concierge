# Lista ekranów

Wszystkie ekrany do zbudowania, pogrupowane po roli. Każdy ekran ma:

- Path
- Główne komponenty
- Stan loading/error/empty
- Krytyczne wartości

## Publiczne (bez auth)

### `/` — Landing

- Hero z propozycją wartości
- Demo wideo
- CTA: "Zarejestruj się" / "Zostań jokusorem"
- Footer z linkami legal

### `/login` — Logowanie

- OAuth buttons (Google, Facebook, Apple)
- Magic link email
- Link do regulaminu
- Komponent: `<OAuthButtons />`

### `/franchise` — Rekrutacja jokusorów

- Opis modelu, zarobki, wymagania
- Formularz aplikacyjny
- Link do regulaminu franczyzowego

## Mieszkaniec — `(resident)`

### `/home` — Ekran główny

**Najważniejszy ekran w aplikacji.**

Układ:

```
┌─────────────────────────────────────┐
│  Cześć, Anna! 👋                    │
│  📍 ul. Wiśniowa 12/4               │
├─────────────────────────────────────┤
│  Aktywne zamówienia: 1              │
│  [🐕 Wyprowadzenie psa, 15:30]     │  ← klik = szczegóły + mapa live
├─────────────────────────────────────┤
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ 🐕     │ │ 📦     │ │ 🛒     │  │
│  │ Pies   │ │ Paczka │ │ Zakupy │  │
│  │ 25 zł  │ │ 8 zł   │ │ 15 zł  │  │
│  └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ 💊     │ │ 🍷     │ │ 📦     │  │
│  │ Apteka │ │ Alko   │ │ List   │  │
│  └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ 🚗     │ │ 🌱     │ │ 🛒     │  │
│  │ Serwis │ │ Kwiat  │ │ Market │  │
│  └────────┘ └────────┘ └────────┘  │
│  + Zobacz wszystkie (24)            │
├─────────────────────────────────────┤
│  💡 Brakuje Ci usługi?              │
│     [Zaproponuj nowy moduł]         │
├─────────────────────────────────────┤
│ [🏠] [🛒] [📦] [👤]          🎤   │
└─────────────────────────────────────┘
```

- Komponenty: `<ModuleTile>`, `<ActiveOrderBanner>`, `<VoiceButton>` (FAB)
- Empty state: jeśli brak modułów (poza zasięgiem) → ekran "MIGMIG jeszcze nie tutaj"

### `/modules/[slug]` — Formularz modułu

- Custom fields modułu (renderowane z `custom_fields` JSON)
- Notatki
- Toggle bodycam (jeśli dostępne)
- Button: "Wybierz slot →"

### `/slots` — Wybór slotu

- 3-5 najbliższych dostępnych slotów
- Większy zakres (jutro, pojutrze) za rozwijaną sekcją
- Dla każdego slotu: godzina + przewidywany jokusor (z oceną)
- Button: "Potwierdź i zapłać"

### `/payment` — BLIK modal

- Kwota + breakdown (cena bazowa + ewentualne dodatki)
- Kod BLIK
- Lub przyciski: Karta / Apple Pay / Google Pay
- Po zaplaceniu: redirect do `/orders/[id]`

### `/orders` — Lista zamówień

- Tabs: Aktywne / Zakończone / Anulowane
- Karty zamówień z statusem + ikoną modułu
- Pull-to-refresh

### `/orders/[id]` — Szczegóły zamówienia + LIVE TRACKING

**Drugi najważniejszy ekran.**

Stany ekranu zależnie od `order.status`:

```
status='pending' (czeka na akceptację)
┌─────────────────────────────────────┐
│  ⏳ Szukamy jokusora                │
│  Zwykle: < 2 minuty                 │
│  Anuluj                             │
└─────────────────────────────────────┘

status='accepted'
┌─────────────────────────────────────┐
│  ✓ Andrzej K. (★ 4.9) przyjmie zlec │
│  Rozpocznie: 15:30                  │
│  [Anuluj] [Czat]                    │
└─────────────────────────────────────┘

status='in_transit'  ← TUTAJ MAPA LIVE
┌─────────────────────────────────────┐
│  🚗 Andrzej w drodze                │
│  ETA: 8 minut                       │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │      [MAPA Z TRASĄ I MARKEREM]  ││
│  │      🚗──────────🏠             ││
│  │                                 ││
│  └─────────────────────────────────┘│
│  Telefon: [📞 zadzwoń]              │
│  [Czat]                             │
└─────────────────────────────────────┘

status='completed'
┌─────────────────────────────────────┐
│  ✓ Wykonano                         │
│  [⭐ Oceń] [💰 Napiwek]             │
│  Pobierz potwierdzenie PDF          │
└─────────────────────────────────────┘
```

- Komponenty: `<LiveTrackingMap>` (Mapbox), `<OrderStatusTimeline>`, `<ChatPanel>`

### `/orders/[id]/rate` — Ocena + napiwek

- 5 gwiazdek
- Pole tekstowe (opcjonalne)
- Quick-pick napiwków: 5 zł / 10 zł / 20 zł / inne
- Submit

### `/orders/[id]/chat` — Czat z jokusorem

- Wiadomości tekstowe + zdjęcia
- "Andrzej pisze..." (presence)
- Realtime via Supabase channel

### `/marketplace` — Marketplace główny

- Filter bar (kategoria, cena, odległość)
- Grid kafelków `<ListingCard>`
- Infinite scroll
- Empty state: zachęta do wystawienia

### `/marketplace/new` — Dodawanie ogłoszenia

- Form z polami: tytuł, opis, kategoria, cena, kondycja
- Upload zdjęć (max 5)
- Adres odbioru (z profilu lub manual)
- Delivery option (MIGMIG-only / pickup-only / both)
- Submit

### `/marketplace/[id]` — Szczegóły ogłoszenia

- Galeria zdjęć (lightbox)
- Tytuł, cena, opis, kondycja
- Profil sprzedawcy (avatar, rating, liczba sprzedaży)
- Komponenty: `<DeliveryRequestModal>`, `<MessageSellerButton>`, `<ReportButton>`

### `/profile` — Profil

- Avatar (z OAuth)
- Imię, email, telefon
- Linki do podstron:
  - Adresy
  - Metody płatności
  - Historia zamówień
  - Moje ogłoszenia
  - Polecanie znajomych
  - Ustawienia
- Wyloguj się

### `/profile/addresses` — Zarządzanie adresami

- Lista adresów
- Dodaj nowy (autocomplete Mapbox)
- Edytuj / usuń
- Ustaw domyślny

### `/profile/payment-methods` — Metody płatności

- Lista zapisanych kart
- BLIK (zawsze dostępny)
- Apple Pay / Google Pay
- Dodaj kartę

### `/propose-module` — Propozycja nowego modułu

- Formularz: nazwa, opis, oczekiwana częstotliwość, oczekiwana cena
- Lista istniejących propozycji z głosowaniem
- Status własnej propozycji

## Jokusor — `(jokusor)`

### `/dashboard` — Dashboard dnia

```
┌─────────────────────────────────────┐
│  Cześć, Andrzej!                    │
│  Dziś: 6 zleceń, 320 zł netto       │
├─────────────────────────────────────┤
│  Następne zlecenie: za 15 min       │
│  🐕 Wyprowadzenie psa (Reksio)      │
│  ul. Wiśniowa 12/4                  │
│  [Otwórz nawigację]                 │
├─────────────────────────────────────┤
│  W tym tygodniu: 1840 zł            │
│  W tym miesiącu: 6 230 zł           │
│  Ranking osiedla: 3 z 8             │
└─────────────────────────────────────┘
```

### `/dashboard/calendar` — Kalendarz

- Widok dnia / tygodnia
- Sloty z zleceniami
- Drag&drop dla zmiany godzin (opcjonalne)
- Filtr modułów

### `/dashboard/service-area` — Zasięg usług

**Trzy zakładki:**

1. **Mapa** — narysuj polygon na mapie Mapbox
2. **Kody pocztowe** — lista kodów (chips do dodawania)
3. **Ulice** — lista ulic (chips)

User wybiera jeden tryb. Domyślny to mapa.

### `/dashboard/jobs` — Zlecenia

- Tabs: Nowe (pending) / W trakcie / Zakończone
- Karty zleceń z przyciskami akcji:
  - [Akceptuj] / [Odrzuć]
  - [Wyruszam] (status → in_transit)
  - [Dotarłem do sklepu] (arrived_pickup)
  - [Zakończ]

### `/dashboard/jobs/[id]` — Szczegóły zlecenia + GPS tracker

- Dane zamówienia + custom_data
- Mapa z trasą
- **Komponent `<GpsTracker>` aktywujący się po `status=in_transit`** — wysyła GPS co 7s
- Checkpoints: przyciski do wciśnięcia w odpowiednich punktach
- Kontakt z mieszkańcem (telefon, czat)

### `/dashboard/earnings` — Zarobki

- Suma za okres (dziś / tydzień / miesiąc / rok)
- Lista zleceń + kwoty
- Faktura miesięczna (PDF download)
- Saldo do wypłaty (jeśli model split-payment)

### `/dashboard/profile` — Profil jokusora

- Dane firmowe (nazwa, NIP, REGON, konto bankowe)
- Godziny pracy
- Urlop (od-do)
- Modułów, które obsługuję (toggle on/off)
- Insurance OC (data ważności)

## Admin — `(admin)`

### `/admin/dashboard` — KPI Dashboard

```
┌─────────────────────────────────────────────────┐
│  Today: 234 zleceń, 8400 zł GMV                 │
│  Mtd: 6 200 zleceń, 218 000 zł GMV              │
│                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ Aktywni     │ │ Konwersja   │ │ NPS        │ │
│  │ jokusorzy   │ │ logowanie   │ │            │ │
│  │ 28 / 32     │ │ → zamówienie│ │ 8.4 / 10   │ │
│  │             │ │ 42%         │ │            │ │
│  └─────────────┘ └─────────────┘ └────────────┘ │
│                                                 │
│  Mapa Polski z osiedlami:                       │
│  [interaktywna mapa]                            │
└─────────────────────────────────────────────────┘
```

### `/admin/modules` — Zarządzanie modułami

- Lista wszystkich modułów
- Toggle: globalnie aktywne / nieaktywne
- Per-osiedle aktywacja

### `/admin/modules/[id]` — Edycja modułu

- Wszystkie pola z `modules`
- Custom fields builder (drag&drop)
- AI intents builder

### `/admin/jokusors` — Lista jokusorów

- Filtr: status (active / pending / suspended)
- Szybki podgląd: imię, osiedle, ocena, liczba zleceń

### `/admin/jokusors/onboarding` — Zatwierdzanie wniosków

- Wnioski w statusie 'pending'
- Dokumenty do weryfikacji
- Przyciski: [Akceptuj] / [Odrzuć] / [Poproś o uzupełnienie]

### `/admin/estates` — Definicja osiedli

- Mapa Polski
- Rysowanie polygonów dla osiedli
- Lista osiedli (aktywne / draft)

### `/admin/proposals` — Propozycje modułów

- Sortowanie po liczbie głosów
- Przyciski: [Zaakceptuj jako pomysł] / [Wdrażam] / [Odrzuć]

### `/admin/professionals` — Zaufani fachowcy

- Lista
- Onboarding nowych (formularz)
- Edycja, weryfikacja

### `/admin/disputes` — Reklamacje

- Lista otwartych reklamacji
- Detale: zamówienie, wiadomości, dowody
- Rozstrzygnięcie: zwrot / odrzucenie / kompromis

### `/admin/finance` — Finanse

- Faktury wystawione
- Faktury do wystawienia (koniec miesiąca)
- Eksport JPK_FA dla księgowej

## Wspólne komponenty

### `<VoiceButton>` (FAB)

- Float w prawym dolnym rogu
- Animacja pulse podczas nasłuchiwania
- Modal otwierany on-click

### `<LiveTrackingMap>`

- Mapbox GL JS
- Marker jokusora animowany
- Trasa GeoJSON
- ETA w nagłówku
- Update co 7s przez Supabase channel

### `<BlikPaymentModal>`

- Pole 6-cyfrowe BLIK
- Timer 60s (BLIK kod expires)
- Fallback do innych metod

### `<ServiceAreaMap>` (dla jokusora)

- Mapbox GL JS Draw plugin
- Polygon drawing
- Display surface area in km²

### `<AddressPicker>`

- Mapbox Geocoding autocomplete
- PL focus
- Validation: czy w obsługiwanym osiedlu

## Stany loading / error / empty

Każdy ekran ma trzy stany:

```typescript
// Suspense fallback (loading)
<div className="space-y-4">
  <Skeleton className="h-32 w-full" />
  <Skeleton className="h-32 w-full" />
</div>

// Error boundary
<ErrorState
  title="Coś poszło nie tak"
  description={error.message}
  retry={() => refetch()}
/>

// Empty state
<EmptyState
  icon={<Icon />}
  title="Brak zamówień"
  description="Złóż pierwsze, klikając kafelek na ekranie głównym."
  cta={<Link href="/home">→ Ekran główny</Link>}
/>
```
