# User flows — przepływy użytkownika

## Zasada nadrzędna

**Od ekranu głównego do potwierdzenia BLIK ma być 3-4 kliknięcia.**

Jeśli flow ma 5+ kliknięć — refactoring obowiązkowy. Jeśli wymaga 5+ — przemyślenie czy to nie jest cały osobny moduł.

## Flow 1: Zamówienie z kafelka (klasyczne)

Cel: zamówić wyprowadzenie psa za 25 zł, slot najbliższy.

```
[Ekran główny / Home]
├── Klik #1: kafelek "🐕 Wyprowadzenie psa"
│
[Ekran modułu — formularz]
├── Imię psa: "Reksio" (wpisane szybko)
├── Długość spaceru: [30 min] [60 min]   ← Klik #2
├── Klik #3: [Wybierz slot →]
│
[Ekran slotów]
├── ◉ Dziś 15:30 (najbliższy)
├── ○ Dziś 17:00
├── ○ Jutro 9:00
├── Klik #4: [Potwierdź i zapłać]
│
[BLIK modal]
├── 25 zł
├── Pole na kod BLIK
└── [Płacę]  ← finalny tap, nie liczy się jako "kliknięcie nawigacyjne"

✓ ZAMÓWIENIE ZŁOŻONE
```

4 kliknięcia. Mieści się w wymaganiu.

### Optymalizacja: domyślne wartości

Jeśli user już zamawiał wyprowadzanie psa wcześniej, system preselectuje:
- Imię psa: wczytane z poprzedniego zamówienia
- Długość spaceru: ostatnio wybrana

Wtedy flow skraca się do **3 kliknięć**:
```
Kafelek → [Wybierz slot] → [Najbliższy] → [Potwierdź] → BLIK
```

## Flow 2: Zamówienie głosem

Cel: ten sam co Flow 1, ale głosem.

```
[Ekran główny]
├── Klik #1: mikrofon na dole ekranu (zawsze widoczny)
│
[Modal nasłuchiwania]
├── "Wyprowadź proszę Reksia o 15:30"
├── Auto-stop po 2s ciszy
│
[Modal weryfikacji]
├── Transkrypcja: "Wyprowadź proszę Reksia o 15:30"
├── Rozpoznano: Wyprowadzanie psa
├── Pies: Reksio
├── Godzina: dziś 15:30
├── Klik #2: [Tak, to się zgadza]
│
[BLIK modal]
└── Tap płatność  ← płatność, nie nawigacja

✓ ZAMÓWIENIE ZŁOŻONE
```

**2 kliknięcia** — głos jest jeszcze szybszy niż kafelek.

### Fallback gdy AI nie zrozumie

```
[Modal weryfikacji]
├── Transkrypcja: "Wyprowadź proszę kotka jutro rano"
├── ⚠ Nie zrozumiałem do końca
├── Mogę pomóc z:
│   • Wyprowadzanie psa  ← najbliższe trafienie
│   • Opieka nad zwierzęciem (kotem)
│   • Coś innego — pokaż wszystkie kafelki
├── Klik #2: wybór jednego
└── Reszta jak Flow 1
```

## Flow 3: Płatność cykliczna (super-power user)

User zamawia codzienne wyprowadzenie psa o 8:00 i 18:00.

```
Tydzień 1 — Flow 1 (4 kliknięcia)
Tydzień 2 — Flow 1, ale system pyta:
            "Chcesz zaprenumerować? 25 zł co dzień, 7 dni w tygodniu, 8:00 i 18:00"
            [Tak] [Nie]
```

Po akceptacji subskrypcji:
- System sam tworzy zamówienia co rano
- User dostaje powiadomienie "Reksio idzie z Andrzejem o 8:00" — bez kliknięć

To docelowe doświadczenie — **0 kliknięć**.

## Flow 4: Marketplace — kupowanie

```
[Marketplace home]
├── Klik #1: kafelek "Rower dla dziecka 250 zł"
│
[Szczegóły ogłoszenia]
├── Galeria zdjęć, opis, sprzedawca
├── Klik #2: [🚚 Kup z dostawą MIGMIG 255 zł]
│
[Wybór slotu dostawy]
├── ◉ Dziś po 18:00
├── ○ Jutro przed południem
├── Klik #3: [Potwierdź]
│
[BLIK modal]
├── 255 zł (250 produkt + 5 dostawa)
└── Tap

✓ KUPIONE
```

3 kliknięcia.

## Flow 5: Marketplace — sprzedawanie

```
[Marketplace home]
├── Klik #1: [+ Wystaw]
│
[Formularz — wszystko na jednym ekranie]
├── Tytuł
├── Kategoria
├── Cena
├── Opis
├── + Dodaj zdjęcie (klik #2 + galeria zdjęć systemowa)
├── Adres odbioru (preselectowany z profilu)
├── Klik #3: [Wystaw ogłoszenie]

✓ OGŁOSZENIE OPUBLIKOWANE
```

3 kliknięcia + dodawanie zdjęć (które są poza liczeniem).

## Flow 6: Profesjonalne usługi (najtrudniejsze, dłuższe flow)

Cel: wezwać hydraulika.

```
[Ekran główny]
├── Klik #1: kafelek "🔧 Przypilnuj hydraulika"
│
[Formularz problemu]
├── Opis problemu: tekst LUB nagranie głosowe LUB zdjęcie
├── Pilność: [Awaria] [Tydzień] [Planowo]   ← Klik #2
├── Klik #3: [Wybierz slot]
│
[Slot + fachowiec]
├── Slot jokusora: dziś 14:00
├── Hydraulik: Marek Nowak (★ 4.9) — 60 zł/h
├── Szacowany koszt: 110-220 zł + materiały
├── Klik #4: [Akceptuj i zapłać kaucję]
│
[BLIK modal]
├── 100 zł kaucji (2h × 50)
└── Tap

✓ ZAMÓWIONE
```

4 kliknięcia. Mimo złożoności biznesowej, UX pozostaje proste.

## Flow 7: Logowanie pierwszy raz

```
[Strona startowa migmig.pl]
├── "Zacznij" — klik #1
│
[Login screen]
├── Klik #2: [Kontynuuj z Google]
├── (Google OAuth dance — automatyczne)
│
[Onboarding: adres]
├── Wpisz adres (autocomplete Mapbox)
├── Klik #3: [Zapisz]
│
[Home — kafelki]
```

3 kliknięcia od zera do możliwości zamówienia.

## Flow 8: Anulowanie zamówienia

```
[Lista zamówień]
├── Klik #1: konkretne zamówienie
│
[Szczegóły]
├── Klik #2: ⋮ menu → "Anuluj"
│
[Potwierdzenie]
├── "Anulujesz na 30 min przed slotem? Brak opłaty."
├── Klik #3: [Tak, anuluj]

✓ ANULOWANE
```

3 kliknięcia.

## Antywzorce — czego unikać

### ❌ Wizard z paskiem postępu „1 z 5"
Mówisz userowi że to długo zanim zaczął. Demotywujące.

### ❌ Modal confirmation dla każdego kroku
"Czy na pewno chcesz...?" — sabotuje flow. Confirmation tylko dla destrukcyjnych operacji (anulowanie zamówienia po opłaceniu).

### ❌ Wymuszanie wypełnienia profilu przed pierwszą akcją
User chce ZAMÓWIĆ, nie wypełniać profil. Dodaj profil w trakcie zamówienia (np. telefon przy potwierdzaniu) tylko jeśli krytyczne.

### ❌ Walidacja błędów na końcu formularza
Waliduj inline — gdy user wychodzi z pola, nie po kliknięciu „Zapisz".

### ❌ Dialog "Pozwól na lokalizację" w niewłaściwym momencie
Pytanie o GPS dopiero gdy user pierwszy raz zamawia. Nie na onboardingu.

## Bottom navigation (mieszkaniec)

```
┌──────────────────────────────────────┐
│                                      │
│        [ekran modułu]                │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  🏠     🛒     📦     👤             │
│ Home  Market  Zamów  Profil          │
└──────────────────────────────────────┘
```

Cztery główne sekcje. Mikrofon AI jest osobno, jako FAB (floating action button) w prawym dolnym rogu — zawsze widoczny w skali aplikacji.

## Bottom navigation (jokusor)

```
┌──────────────────────────────────────┐
│                                      │
│        [aktualne zlecenie]           │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  📅     📋     🗺     💰     👤      │
│ Dziś  Lista  Zasięg  Kasa  Profil    │
└──────────────────────────────────────┘
```

## Heatmaps i monitoring

PostHog event tracking:
- `flow_started` z `{ flow_name, entry_point }`
- `flow_step_completed` z `{ flow_name, step_number, step_name }`
- `flow_completed` z `{ flow_name, total_clicks, time_sec }`
- `flow_abandoned` z `{ flow_name, last_step }`

Cel: średnia liczba kliknięć dla flow zamówienia ≤ 4.0.
