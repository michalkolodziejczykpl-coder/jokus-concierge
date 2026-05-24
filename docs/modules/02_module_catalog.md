# Katalog modułów — wszystkie usługi

Dane do zaseedowania w `migrations/20260516000003_seed_modules.sql`.

## Kategoria: delivery (odbiór i dostawa)

### `package-pickup` — Odbiór paczki

- Cena bazowa: 8 zł
- Czas: 20 min
- Custom fields: `tracking_number` (text, wymagane), `pickup_location` (text, wymagane), `notes` (text, opcjonalne)
- AI intents: cena_paczki, ile_trwa, jakie_kurierów

### `mail-pickup` — Odbiór listu poleconego

- Cena bazowa: 2 zł
- Czas: 15 min
- Wymaga pełnomocnictwa pocztowego (przewodnik w aplikacji)
- Custom fields: `mail_office` (select: Poczta Polska / paczkomat pocztowy), `power_of_attorney_uploaded` (bool, wymagane)

### `package-delivery-c2c` — Dostawa z marketplace MIGMIG

- Cena bazowa: 5 zł (w obrębie osiedla) lub 12 zł (osiedle-osiedle)
- Czas: 30 min
- Custom fields: `listing_id` (auto, z marketplace), `seller_address` (auto), `buyer_address` (auto)
- Specjalność: trigger z marketplace, nie z głównego ekranu kafelków

## Kategoria: shopping (zakupy)

### `grocery-shopping` — Zakupy spożywcze

- Cena bazowa: 15 zł + paragon
- Czas: 60 min
- Custom fields: `shopping_list` (text lub photo), `preferred_shop` (select: Biedronka / Lidl / Carrefour / Żabka / inny), `max_amount` (number)

### `pharmacy` — Apteka

- Cena bazowa: 12 zł + paragon
- Czas: 30 min
- Custom fields: `prescription_type` (select: e-recepta / papierowa / OTC), `e_prescription_code` (text, opcjonalne), `medications` (text)

### `tobacco-alcohol` — Tytoń i alkohol

- Cena bazowa: 10 zł + paragon
- Czas: 25 min
- **Wymaga weryfikacji wieku 18+ w profilu**
- Custom fields: `products` (text), `id_check_consent` (bool)

### `document-scanning` — Skanowanie dokumentów

- Cena bazowa: 8 zł
- Czas: 30 min
- Custom fields: `pages_count` (number), `delivery_format` (select: PDF / JPG / pocztą)

## Kategoria: transport

### `car-to-service` — Auto do serwisu

- Cena bazowa: 40 zł
- Czas: 45 min
- Custom fields: `car_make_model` (text), `service_address` (text), `keys_location` (select: u sąsiada / pod wycieraczką / przekażę osobiście), `return_after_service` (bool)

### `airport-transfer` — Transfer na lotnisko

- Cena bazowa: 80 zł + km
- Czas: 90 min (zależnie od lotniska)
- Custom fields: `airport` (select: WRO / KTW / POZ), `flight_time` (datetime), `passengers_count` (number), `luggage_count` (number), `help_with_luggage` (bool)

### `medical-transport` — Transport medyczny

- Cena bazowa: 50 zł + 0.50 zł/min czekania
- Czas: 120 min
- Custom fields: `appointment_address` (text), `appointment_time` (datetime), `mobility_assistance_needed` (bool), `companion_during_visit` (bool, +20 zł)

## Kategoria: home_pet (dom i zwierzęta)

### `dog-walking` — Wyprowadzanie psa

- Cena bazowa: 25 zł
- Czas: 30 min
- Custom fields: `dog_name` (text), `dog_photo` (photo), `walk_duration` (select: 30min/60min), `special_instructions` (text), `pickup_location` (select: pod drzwiami / klucze u sąsiada)

### `pet-care` — Opieka nad zwierzęciem

- Cena bazowa: 20 zł/wizyta
- Czas: 20 min
- Custom fields: `pet_type` (select: kot / pies / ryby / inne), `tasks` (multiselect: karmienie / podawanie wody / kuweta / spacer)

### `plant-watering` — Podlewanie kwiatów

- Cena bazowa: 15 zł/wizyta
- Czas: 15 min
- Custom fields: `plants_count` (number), `frequency` (select: jednorazowe / co drugi dzień / co tydzień), `apartment_check` (bool, +5 zł)

### `vacation-bundle` — Pakiet „Wyjeżdżam"

- Cena bazowa: 150 zł/tydzień (negocjowana)
- Czas: zmienny
- Custom fields: `vacation_start` (date), `vacation_end` (date), `services` (multiselect: poczta / kwiaty / zwierzę / sprawdzenie mieszkania)
- Specjalność: nie zlecenie pojedyncze, tylko abonament tygodniowy

## Kategoria: errands (sprawy urzędowe)

### `queue-standing` — Stanie w kolejce

- Cena bazowa: 30 zł/godz
- Czas: 60-180 min
- Custom fields: `location` (select: urząd / ZUS / US / biuro paszportowe / inny), `arrival_time` (datetime), `notify_when_close_to_top` (bool)

### `gig-driver-accounting` — Rozliczenia kierowców

- Cena bazowa: indywidualna wycena
- Czas: 60 min
- Custom fields: `platforms` (multiselect: Uber / Bolt / Wolt / Glovo), `accounting_period` (select: tydzień / miesiąc / kwartał)

### `bodycam-recording` — Bodycam (dodatek)

- Cena bazowa: +5 zł
- Czas: zerowy (dodawane do innej usługi)
- **Specjalność:** nie samodzielny moduł, tylko opcja w innych modułach
- Custom fields: zero (toggle "tak/nie")

## Kategoria: professional (przypilnuj fachowca) — NOWA

Mieszkaniec nie kontaktuje się sam z fachowcem (hydraulik, elektryk, ślusarz). Zamiast tego:

1. Mieszkaniec opisuje problem w aplikacji
2. MIGMIG wysyła jokusora, który ocenia problem na miejscu
3. Jokusor wzywa zaufanego fachowca z bazy MIGMIG
4. Jokusor jest na miejscu podczas naprawy (mieszkaniec może być w pracy)
5. Jokusor odbiera fakturę i robi zdjęcia po naprawie
6. Mieszkaniec płaci za usługę fachowca + opłatę za pilnowanie (np. 50 zł/godz)

### `plumber-supervision` — Przypilnuj hydraulika

- Cena bazowa: 50 zł/godz + koszt usługi fachowca
- Czas: 60-180 min
- Custom fields: `problem_description` (text, wymagane), `problem_photos` (photo, opcjonalne), `urgency` (select: dziś / w ciągu tygodnia / planowo), `preferred_plumber` (select: dowolny zaufany / mój)

### `electrician-supervision` — Przypilnuj elektryka

- Cena bazowa: 50 zł/godz
- Custom fields: jak hydraulik + `power_outage` (bool, priorytet)

### `locksmith-supervision` — Przypilnuj ślusarza

- Cena bazowa: 50 zł/godz
- Custom fields: `lock_problem` (select: zatrzask / wyłamany klucz / wymiana zamka)

### `handyman-supervision` — Przypilnuj „złotej rączki"

- Cena bazowa: 50 zł/godz
- Custom fields: `task_description`, `tools_provided` (bool)

### `appliance-repair-supervision` — Przypilnuj serwisanta AGD

- Cena bazowa: 50 zł/godz
- Custom fields: `appliance` (select: pralka / lodówka / zmywarka / piekarnik / inne), `brand`, `problem_description`

### Baza zaufanych fachowców

Osobna tabela `trusted_professionals` zarządzana przez admina:

```sql
CREATE TABLE trusted_professionals (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL, -- 'plumber' | 'electrician' | etc
  estate_ids uuid[],      -- które osiedla obsługuje
  phone text NOT NULL,
  email text,
  hourly_rate numeric(10,2),
  rating numeric(3,2),
  notes text,             -- wewnętrzne notatki admina
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

Jokusor podczas zlecenia widzi listę zaufanych fachowców dla swojego osiedla i wybiera kogo dzwoni.

## Kategoria: marketplace — NOWA

### `marketplace-listing` — Wystaw ogłoszenie

Nie typowy moduł — dostępny zawsze z poziomu `/marketplace/new`. Cena: 0 zł (darmowe wystawienie).

### `marketplace-delivery` — Zamów dostawę z marketplace

Auto-trigger po kliknięciu „Kup" przy ogłoszeniu C2C.

- Cena: jak `package-delivery-c2c`

Szczegóły: `docs/modules/03_marketplace_c2c.md`.

## Podsumowanie liczbowe

- **Łącznie modułów:** 24
- **Kategorii:** 7
- **Modułów wymagających specjalnej weryfikacji:** 2 (tytoń+alkohol — wiek, e-recepta)
- **Modułów z punktem pickup:** 6 (grocery, pharmacy, tobacco, car-to-service, document-scanning, marketplace-delivery)
- **Modułów z timerem (godzinowych):** 4 (queue-standing + 4 supervision)

## SQL do seedowania

Pełen SQL w `docs/database/01_schema.sql` — sekcja "SEED MODULES".
