# Mini-marketplace C2C (sąsiad-sąsiadowi)

## Koncepcja

Mieszkańcy osiedla mogą sprzedawać/kupować rzeczy od siebie nawzajem, z opcją zamówienia dostawy przez jokusora JOKUS. Lokalne OLX/Vinted z transportem w jednym kliknięciu.

## Dlaczego C2C a nie B2C na start

1. **Niska bariera wejścia** — każdy mieszkaniec może wystawić ogłoszenie (zero onboarding sprzedawców).
2. **Network effect** — im więcej mieszkańców, tym więcej ogłoszeń, tym więcej kupujących.
3. **Niska odpowiedzialność prawna** — JOKUS to platforma, nie sprzedawca (nie odpowiada za gwarancję).
4. **Naturalna ścieżka do B2C** — po walidacji modelu można dopisać sprzedawców biznesowych.

## Customer journey

### Sprzedawca:

1. `/marketplace/new` — formularz dodania ogłoszenia
2. Wypełnia: tytuł, opis, cena, kategoria, zdjęcia (max 5), preferowany sposób odbioru
3. Publikacja → ogłoszenie widoczne dla wszystkich na osiedlu
4. Otrzymuje powiadomienie gdy ktoś jest zainteresowany
5. Czat z kupującym, ustalenie szczegółów
6. Kupujący zamawia dostawę → sprzedawca otrzymuje notyfikację „Jokusor będzie po odbiór o 15:30"
7. Jokusor odbiera, sprzedawca dostaje płatność (lub kupujący płaci jokusorowi przy odbiorze)

### Kupujący:

1. `/marketplace` — przeglądanie ogłoszeń
2. Filtry: kategoria, cena, odległość
3. Klika ogłoszenie → szczegóły
4. „Kup z dostawą JOKUS" → wybór slotu dla jokusora
5. Płatność (cena + dostawa)
6. Śledzenie jokusora live
7. Po dostawie: ocena (zarówno jokusora, jak i sprzedawcy)

## Tabele bazy

```sql
CREATE TABLE marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id),
  estate_id uuid NOT NULL REFERENCES estates(id),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  -- 'electronics' | 'clothing' | 'books' | 'home' | 'kids' | 'sports' | 'other'
  price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PLN',
  condition text NOT NULL,
  -- 'new' | 'like_new' | 'good' | 'used' | 'for_parts'
  status text NOT NULL DEFAULT 'active',
  -- 'active' | 'reserved' | 'sold' | 'archived' | 'removed'
  photos text[] NOT NULL DEFAULT '{}',
  pickup_address jsonb NOT NULL, -- {street, building, apartment, point: {lat, lng}}
  delivery_option text NOT NULL DEFAULT 'migmig_or_pickup',
  -- 'migmig_only' | 'pickup_only' | 'migmig_or_pickup'
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_listings_estate_status ON marketplace_listings(estate_id, status);
CREATE INDEX idx_listings_category ON marketplace_listings(category, status);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_id);

CREATE TABLE marketplace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id),
  buyer_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  delivery_order_id uuid REFERENCES orders(id),
  -- powiązanie z normalnym zamówieniem JOKUS na dostawę
  item_price numeric(10,2) NOT NULL,
  delivery_price numeric(10,2),
  payment_status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'paid_to_migmig' | 'released_to_seller' | 'refunded'
  payment_method text,
  -- 'blik_escrow' | 'cash_on_delivery'
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

## Płatność — model escrow

Problem: jak chronić kupującego przed oszustwem (sprzedawca wziął kasę, nic nie wysłał) i sprzedawcę (kupujący się rozmyślił po dostarczeniu)?

**Rozwiązanie:**

1. **Kupujący płaci JOKUS** (BLIK) cenę przedmiotu + dostawę.
2. JOKUS trzyma pieniądze przedmiotu na koncie escrow.
3. Sprzedawca dostaje notyfikację: „Twoje pieniądze (250 zł) są zabezpieczone".
4. Jokusor odbiera przedmiot od sprzedawcy.
5. Jokusor dostarcza do kupującego — kupujący ma 15 minut na sprawdzenie.
6. Jeśli kupujący potwierdzi „OK" w aplikacji → JOKUS przelewa pieniądze sprzedawcy (minus prowizja 5%).
7. Jeśli kupujący zgłosi reklamację w ciągu 15 minut → spór trafia do admina.

**Prowizja JOKUS od marketplace:** 5% wartości przedmiotu (dodatkowo do opłaty za dostawę).

**Alternatywa:** „Płać przy odbiorze" — kupujący płaci jokusorowi gotówką lub BLIKiem na miejscu. Mniej bezpieczne ale czasem preferowane.

## Moderacja

Ogłoszenia są moderowane przed publikacją:

1. **Auto-moderacja przez AI:**
   - Klasyfikacja kategorii (czy zgodna z deklaracją)
   - Wykrywanie zakazanych przedmiotów (broń, alkohol pod stołem, leki na receptę, podróbki)
   - Wykrywanie wulgaryzmów w opisie
   - Sprawdzenie czy zdjęcia są autentyczne (reverse image search)

2. **Human-in-the-loop:**
   - Ogłoszenia z confidence < 0.9 trafiają do kolejki moderacyjnej admina
   - Admin akceptuje/odrzuca w ciągu 24h
   - Po 3 odrzuconych ogłoszeniach od jednego użytkownika — auto-flag konta

3. **Reakcje społeczności:**
   - Przycisk „Zgłoś" przy każdym ogłoszeniu
   - 3 zgłoszenia → ogłoszenie ukryte do weryfikacji

## Zakazane przedmioty

Lista w `lib/constants.ts`:

```typescript
export const FORBIDDEN_CATEGORIES = [
  'weapons', // broń (wszystkie rodzaje)
  'prescription_drugs', // leki na receptę
  'alcohol', // alkohol bez koncesji
  'tobacco', // tytoń bez koncesji
  'live_animals', // żywe zwierzęta (osobne procedury)
  'adult_content', // treści dla dorosłych
  'counterfeit', // podróbki znanych marek
  'stolen_goods', // skradzione (oczywiste)
  'human_remains', // ludzkie tkanki/organy
  'hazardous' // materiały niebezpieczne
];
```

## Ograniczenia

- Max 10 aktywnych ogłoszeń per użytkownik (limit anti-spam)
- Max 5 zdjęć per ogłoszenie, max 10MB każde
- Zdjęcia auto-resize do 1200px (oszczędność storage)
- Cena: min 5 zł, max 50 000 zł (większe → kontakt z adminem)
- Ogłoszenie automatycznie archiwizuje się po 30 dniach bez aktywności

## Ekran główny `/marketplace`

```
┌──────────────────────────────────────────────────────────┐
│ 🛒 Marketplace osiedlowy                  [+ Wystaw]     │
├──────────────────────────────────────────────────────────┤
│ Kategoria: [Wszystkie ▼]  Cena: [____ - ____]            │
│ 🔍 [Szukaj na osiedlu...                          ]      │
├──────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ [zdj]    │ │ [zdj]    │ │ [zdj]    │ │ [zdj]    │      │
│ │ Rower    │ │ Stół     │ │ Książki  │ │ Konsola  │      │
│ │ dla dz.  │ │ kuchenny │ │ paczka   │ │ PS4      │      │
│ │ 250 zł   │ │ 400 zł   │ │ 30 zł    │ │ 800 zł   │      │
│ │ 200m od  │ │ Twój bl. │ │ 300m     │ │ 150m     │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│ ┌──────────┐ ┌──────────┐ ...                            │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

## Ekran szczegółów `/marketplace/[id]`

```
┌──────────────────────────────────────────────────────────┐
│ ← Wróć                                                   │
├──────────────────────────────────────────────────────────┤
│ [Główne zdjęcie produktu]                                │
│ [galeria miniatur: 1 2 3 4 5]                            │
├──────────────────────────────────────────────────────────┤
│ Rower dla dziecka                                250 zł  │
│ Stan: bardzo dobry                                       │
│ Sprzedaje: Anna K. (★ 4.8, 12 sprzedaży)                 │
│ Lokalizacja: Krzyki, ul. Wiśniowa (200m od Ciebie)       │
├──────────────────────────────────────────────────────────┤
│ Opis:                                                    │
│ Rower dla dziecka 5-7 lat, kupiony rok temu, używany     │
│ sporadycznie. Świetny stan, drobne ślady na ramie.       │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🚚 Kup z dostawą JOKUS — 255 zł (250 + 5 zł)        │ │
│ │ Jokusor odbiera od sprzedawcy i przywozi do Ciebie.  │ │
│ │ [Wybierz slot →]                                     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Lub: [💬 Napisz do sprzedawcy] [📍 Odbiór osobisty]      │
└──────────────────────────────────────────────────────────┘
```

## Komponenty UI

- `<ListingCard>` — kafelek ogłoszenia w gridzie
- `<ListingForm>` — formularz dodawania/edycji
- `<ListingGallery>` — galeria zdjęć z lightboxem
- `<DeliveryRequestModal>` — modal zamawiania dostawy JOKUS
- `<EscrowStatusBadge>` — status płatności (pending/paid/released)
