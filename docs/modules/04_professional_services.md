# Moduły profesjonalne — „Przypilnuj fachowca"

## Problem biznesowy

Mieszkaniec ma problem (np. cieknący kran). Klasyczne ścieżki to:

1. Sam szuka hydraulika w internecie → ryzyko trafienia na nieuczciwego
2. Bierze urlop, czeka cały dzień → strata pieniędzy + nerwy
3. Daje klucze sąsiadowi → niezbyt komfortowe

**Rozwiązanie JOKUS:**

1. Mieszkaniec opisuje problem w aplikacji
2. JOKUS ma zaufaną bazę fachowców (zweryfikowanych przez admina)
3. Jokusor jest w mieszkaniu podczas naprawy — jako oczy mieszkańca
4. Mieszkaniec może być w pracy

To **najwyżej-marżowy moduł** w katalogu (50 zł/godz jokusora + prowizja od fachowca).

## Customer journey

### Mieszkaniec:

1. Klika kafelek „Przypilnuj fachowca" → wybiera typ (hydraulik/elektryk/...)
2. Opisuje problem: tekst + zdjęcia + pilność
3. (Opcjonalnie) Wybiera preferowanego fachowca z listy zaufanych
4. Wybiera slot dla jokusora (kiedy może być w mieszkaniu)
5. Płaci za pilnowanie z góry (50 zł × przewidywany czas)
6. Otrzymuje 2 powiadomienia:
   - „Jokusor Andrzej przybędzie o 14:00"
   - „Hydraulik Marek (★ 4.9) przybędzie o 14:30"
7. Live tracking obu osób (jokusora + fachowca)
8. Po naprawie:
   - Jokusor robi zdjęcia stanu po
   - Fachowiec wystawia paragon/fakturę
   - Mieszkaniec płaci za naprawę osobno (BLIK do fachowca lub przez JOKUS)
9. Ocena: zarówno jokusora, jak i fachowca

### Jokusor:

1. Otrzymuje zlecenie z opisem problemu
2. Akceptuje → wybiera fachowca z listy zaufanych dla swojego osiedla
3. Dzwoni do fachowca, umawia czas
4. Czeka pod adresem
5. Wpuszcza fachowca (lub jest na miejscu z mieszkańcem)
6. **Obserwuje pracę, robi zdjęcia, zadaje pytania**
7. Po naprawie odbiera paragon, zdjęcia po
8. Zamyka zlecenie

### Fachowiec:

1. Otrzymuje SMS/telefon od jokusora (nie ma aplikacji JOKUS na start)
2. Przyjeżdża, naprawia
3. Wystawia paragon/fakturę
4. Otrzymuje płatność (od mieszkańca lub przez przelew z JOKUS po fakcie)

W przyszłości (etap 2): aplikacja dla fachowców z systemem zleceń + płatności automatycznych.

## Cennik

| Czynność                       | Cena                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| Pilnowanie jokusora            | 50 zł/godz (min 1 godz)                                           |
| Dojazd jokusora                | wliczone                                                          |
| Wezwanie fachowca              | wliczone (admin negocjuje z fachowcami)                           |
| Praca fachowca                 | wg cennika fachowca (15-200 zł/godz w zależności od specjalności) |
| Materiały                      | wg paragonu fachowca                                              |
| **Prowizja JOKUS od fachowca** | 10% wartości usługi fachowca                                      |

## Lista zaufanych fachowców

```sql
CREATE TABLE trusted_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  category text NOT NULL,
  -- 'plumber' | 'electrician' | 'locksmith' | 'handyman' | 'appliance_repair'
  -- | 'gas_technician' | 'painter' | 'cleaner_specialist' | 'carpenter'
  service_areas uuid[] NOT NULL, -- które osiedla
  phone text NOT NULL,
  email text,
  company_name text,
  nip text,
  hourly_rate numeric(10,2),
  callout_fee numeric(10,2) DEFAULT 0,
  rating numeric(3,2),
  completed_jobs integer DEFAULT 0,
  verified boolean DEFAULT false,
  verification_documents jsonb,
  -- {licenses: [...], insurance: ..., id_verified: bool}
  emergency_available boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes_admin text, -- prywatne notatki admina
  created_at timestamptz DEFAULT now()
);

CREATE TABLE trusted_professional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES trusted_professionals(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  reviewer_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
```

## Onboarding fachowca (proces admina)

Admin w panelu `/admin/professionals`:

1. **Dodanie nowego fachowca:**
   - Imię nazwisko / nazwa firmy
   - Kategoria
   - Osiedla obsługiwane
   - Telefon, email
   - Stawka godzinowa
   - Opłata za dojazd
   - Czy dostępny w trybie awaryjnym (weekendy, noce)
   - NIP (jeśli firma)
   - **Upload skanu uprawnień** (np. SEP dla elektryków, świadectwo czeladnicze)
   - **Upload polisy OC** (wymagane dla zaufania)
   - Notatki wewnętrzne

2. **Weryfikacja:**
   - Admin weryfikuje dokumenty
   - Pierwsze 3 zlecenia → admin osobiście dzwoni i sprawdza jakość
   - Po 10 pozytywnych ocenach → status „verified"

3. **Umowa współpracy:**
   - Standardowa umowa JOKUS ↔ fachowiec
   - Prowizja 10% od każdego zlecenia
   - Płatność tygodniowa lub miesięczna (wybór fachowca)
   - Wyłączność na danym osiedlu (opcjonalne, premium)

## Ekran zamówienia modułu professional

```
┌──────────────────────────────────────────────────────────┐
│ 🔧 Przypilnuj hydraulika                                 │
├──────────────────────────────────────────────────────────┤
│ Co jest problemem? *                                     │
│ [Cieknie kran w kuchni, kapie z baterii         ]        │
│ [.........................................     ]        │
│                                                          │
│ Zdjęcia (max 5):                                         │
│ [+ Dodaj zdjęcie]  [zdj1] [zdj2]                         │
│                                                          │
│ Pilność:                                                 │
│ ○ Awaria — dziś (+50% do stawki)                         │
│ ● W ciągu tygodnia (standard)                            │
│ ○ Planowo — możemy ustalić                               │
│                                                          │
│ Preferowany hydraulik:                                   │
│ [Dowolny zaufany ▼]                                      │
│   - Marek Nowak (★ 4.9, 47 zleceń) — 60 zł/godz          │
│   - Tomasz Kowalski (★ 4.7, 23 zlec.) — 50 zł/godz       │
│                                                          │
│ Przewidywany czas: 1-2 godziny                           │
│                                                          │
│ Szacowany koszt:                                         │
│ • Pilnowanie jokusora: 50-100 zł                         │
│ • Praca hydraulika: 60-120 zł (zależnie od godzin)       │
│ • Materiały: wg potrzeb                                  │
│ • SUMA: ~110-220 zł + materiały                          │
│                                                          │
│ [Dalej: wybierz slot →]                                  │
└──────────────────────────────────────────────────────────┘
```

## Rozliczenie

Każde zlecenie professional ma trzy strumienie pieniędzy:

1. **Mieszkaniec → JOKUS (z góry):** 50 zł/godz × przewidywany czas (pilnowanie)
2. **Mieszkaniec → fachowiec (po fakcie):** kwota z paragonu (BLIK lub gotówka)
3. **Fachowiec → JOKUS (po fakcie):** 10% prowizji od strumienia 2

**Rozliczenie wewnątrz JOKUS:**

- Strumień 1: 70% jokusor + 30% JOKUS (jak normalna prowizja)
- Strumień 3: 100% JOKUS (prowizja od fachowca)

**Alternatywny model (prostszy księgowo):**
Mieszkaniec płaci całość przez JOKUS (pilnowanie + naprawa), JOKUS rozlicza się z fachowcem. Wymaga jednak licencji płatniczej lub współpracy z agentem (Przelewy24 oferuje split payments).

**Decyzja MVP:** model rozdzielny (3 strumienie), bo prostszy księgowo. Migracja na model zintegrowany w fazie skalowania.

## Awarie 24/7

Niektórzy fachowcy (z `emergency_available = true`) mogą być wzywani poza godzinami pracy. Cennik:

- Stawka × 1.5 (popołudnia, weekendy)
- Stawka × 2.0 (noce 22:00-6:00, święta)
- Dojazd: +50 zł

Mieszkaniec widzi to przed potwierdzeniem zamówienia.

## Pułapki, które trzeba rozwiązać

1. **Co jeśli jokusor zauważy fuszerkę?**
   - Procedura: jokusor odznacza w aplikacji „nie potwierdzam jakości"
   - Płatność do fachowca jest wstrzymana (escrow)
   - Spór trafia do admina
   - Mieszkaniec dostaje opcję wezwania innego fachowca na koszt poprzedniego

2. **Co jeśli fachowiec nie przyjdzie?**
   - Jokusor czeka max 30 min
   - System wzywa kolejnego z listy
   - Pierwszy fachowiec dostaje ostrzeżenie (3 → odebranie z bazy)

3. **Co jeśli problem jest większy niż się wydawało?**
   - Fachowiec konsultuje z jokusorem
   - Jokusor dzwoni do mieszkańca (lub robi notatkę głosową w aplikacji)
   - Mieszkaniec decyduje: kontynuować / przełożyć / anulować
   - Dotychczasowy czas pracy jokusora i fachowca jest płatny
