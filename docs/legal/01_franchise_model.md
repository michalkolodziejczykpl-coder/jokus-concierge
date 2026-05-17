# Model franczyzowy MIGMIG

## Zasada

JOKUS Sp. z o.o. (Wrocław, NIP 9131639730) jest **organizatorem sieci**. Jokusorzy są **niezależnymi przedsiębiorcami** świadczącymi usługi pod marką MIGMIG na podstawie umowy franczyzowej.

To **NIE jest zatrudnienie** — jokusor:
- Sam prowadzi działalność (JDG lub spółkę)
- Sam rozlicza się z US i ZUS
- Sam wystawia faktury (lub paragony)
- Nie ma podporządkowania pracowniczego (sam ustala godziny, urlopy, czy pracuje danego dnia)

To kluczowe rozróżnienie prawne — niezależność jest fundamentem modelu (i niższych kosztów operacyjnych dla JOKUS Sp. z o.o.).

## Trzy modele rozliczeń

Admin (Michał) decyduje per jokusor, który model wybiera. Trzy opcje w tabeli `jokusors.billing_model`:

### 1. `subscription_only` — tylko abonament
- Jokusor płaci stały abonament (np. 299 zł / miesiąc)
- Bez prowizji od zleceń
- 100% przychodu zostaje u jokusora
- Dobry dla: jokusora z bardzo dużą liczbą zleceń (>200/mies)

**Przychód JOKUS:** 299 zł × liczba jokusorów

### 2. `commission_only` — tylko prowizja
- Bez abonamentu
- Prowizja 15-25% od każdego zlecenia
- Dobry dla: jokusora startującego, niskie zlecenia
- Łatwy próg wejścia (zero kosztu na start)

**Przychód JOKUS:** prowizja × suma zleceń

### 3. `hybrid` — mieszany (rekomendowany start)
- Niski abonament (np. 99 zł / miesiąc)
- Niska prowizja (np. 8% od zleceń)
- Najbardziej balansowany
- Jokusor czuje że płaci abonament więc się stara go „zwrócić" zleceniami
- JOKUS ma przewidywalny przychód bazowy

**Przychód JOKUS:** 99 zł × N + 0.08 × suma_zleceń

## Symulacja przychodów

Założenia (konserwatywne):
- 30 jokusorów aktywnych
- Każdy 100 zleceń/mies × 50 zł średnio = 5000 zł GMV/jokusor/mies
- Łączny GMV: 150 000 zł/mies

| Model | Przychód JOKUS/mies | Per jokusor |
|-------|---------------------|-------------|
| subscription_only (299 zł) | 8 970 zł | 5 000 zł (100%) |
| commission_only (20%) | 30 000 zł | 4 000 zł (80%) |
| hybrid (99 zł + 8%) | 14 970 zł | 4 501 zł (90%) |

Hybrid daje JOKUS ~15k zł/mies przy 30 jokusorach. Z tego pokrywamy:
- Infrastruktura: ~900 zł
- Mapbox: ~200 zł
- OpenAI: ~300 zł
- Płatności (Przelewy24): ~600 zł
- Sentry/PostHog: ~150 zł
- **SUMA tech:** ~2 200 zł
- Marketing: ~2 000 zł
- Pozostałe (księgowa, opłaty bankowe): ~1 500 zł
- **Marża netto:** ~9 270 zł/mies (62%)

Próg rentowności (na pokrycie kosztów stałych): **6 aktywnych jokusorów w hybrid**.

## Co dostaje jokusor w zamian za abonament/prowizję

1. **Marka i marketing**
   - Logo MIGMIG, materiały promocyjne
   - SEO, kanały social, content
   - Lokalne kampanie reklamowe

2. **Aplikacja i system**
   - Aplikacja na telefon (PWA + RN)
   - System przyjmowania zleceń
   - Kalendarz, statystyki
   - Czat z mieszkańcami

3. **Pozyskanie klientów**
   - JOKUS robi marketing, jokusor dostaje zlecenia
   - Mieszkańcy nie szukają jokusora — system im przydziela

4. **Szkolenia i wsparcie**
   - Onboarding (jak realizować zlecenia)
   - Szkolenia z bezpieczeństwa (zwłaszcza przypilnuj fachowca)
   - Hot-line z supportem JOKUS

5. **Wsparcie prawne**
   - Wzory umów z mieszkańcami (jeśli potrzeba)
   - Ochrona przed reklamacjami (mediacja)
   - Polisa OC zbiorowa (grupowa, taniej niż indywidualnie)

6. **Płatności**
   - Mieszkaniec płaci przez MIGMIG (Przelewy24)
   - Jokusor dostaje rozliczenie tygodniowe lub miesięczne
   - Brak ryzyka nieuczciwych klientów

7. **Lokalny ekosystem**
   - Marketplace C2C — dodatkowe zlecenia dostawy
   - Moduł professional — wyższy ticket size
   - Programy lojalnościowe dla mieszkańców (jokusor korzysta z lojalności)

## Co jokusor MUSI zapewnić

1. **Forma prawna**
   - JDG (najprostsze) lub spółka z o.o.
   - Zarejestrowana w CEIDG / KRS
   - Aktywne wpis VAT (jeśli przekracza 200k obrotu) lub zwolnienie

2. **Dokumenty**
   - Zaświadczenie o niekaralności (KRK) — wymagane przed startem
   - Polisa OC zawodowa (zbiorowa MIGMIG lub własna, min 100k PLN)
   - Auto z aktualną OC + ważnym przeglądem (jeśli moduły transportowe)
   - Prawo jazdy kat. B (jeśli moduły transportowe)

3. **Sprzęt**
   - Smartfon z Android 10+ lub iOS 15+
   - Internet mobilny (LTE / 4G / 5G)
   - Konto bankowe firmowe
   - Telefon kontaktowy

4. **Czas i dyspozycyjność**
   - Minimum 20 godzin tygodniowo
   - Reakcja na nowe zlecenie: do 5 min
   - Zaakceptowanie minimum 80% przydzielonych zleceń

5. **Standardy obsługi**
   - Punktualność (max 10 min spóźnienia)
   - Schludny ubiór (oficjalny T-shirt MIGMIG opcjonalny)
   - Komunikacja kulturalna (audyty wyrywkowe przez admina)

## Umowa franczyzowa — kluczowe punkty

### Czas trwania
- 12 miesięcy
- Auto-przedłużenie na kolejne 12 (chyba że wypowiedzenie 30 dni przed końcem)

### Wypowiedzenie
- Bez podania przyczyny: 30 dni okresu wypowiedzenia
- W przypadku rażących naruszeń (kradzież, oszustwo, nieuczciwość): natychmiastowe

### Wyłączność terytorialna
- Jokusor ma **rejon obsługi** (osiedle lub kilka osiedli)
- Może obsługiwać tylko adresy w swoim rejonie
- JOKUS gwarantuje, że nie przydzieli innego jokusora na ten sam rejon, dopóki obecny pokrywa zapotrzebowanie

**Wyjątki:**
- Jeśli jokusor osiąga >150 zleceń/mies — wskazany jako kandydat do rekrutacji „zespołowca" (pomocnika)
- Jeśli jokusor jest na urlopie — zastępstwo z innego rejonu

### Kary umowne
- Brak akceptacji zlecenia w 5 min: bez kary (system przekazuje do innego)
- Nieuzasadnione anulowanie po akceptacji: 30 zł (z prowizji)
- Negatywna ocena (1-2★) z winy jokusora: 50 zł + szkolenie korygujące
- Trzy negatywne oceny w miesiącu: zawieszenie kont
- Naruszenie RODO (dane mieszkańców do osób trzecich): 5000 zł + natychmiastowe rozwiązanie

### Zakaz konkurencji
- Jokusor nie może świadczyć podobnych usług pod inną marką w swoim rejonie
- 6 miesięcy po zakończeniu umowy: zakaz świadczenia podobnych usług w tym samym rejonie
- Wyjątek: jeśli to JOKUS rozwiązał umowę bez winy jokusora — zakaz nie obowiązuje

## Wynagradzanie — przepływy pieniężne

### Standardowe zamówienie (np. wyprowadzenie psa, 25 zł)

```
Mieszkaniec płaci 25 zł BLIK do Przelewy24
        ↓
Przelewy24 trzyma na koncie JOKUS Sp. z o.o.
        ↓
Po 7 dniach JOKUS wystawia FV jokusorowi za prowizję 8% × 25 zł = 2 zł
JOKUS przelewa jokusorowi 23 zł (lub akumuluje do tygodniowej wypłaty)
        ↓
Jokusor wystawia paragon mieszkańcowi (lub elektroniczny przez aplikację)
```

### Marketplace (np. rower za 250 zł + dostawa 5 zł)

```
Kupujący płaci 255 zł BLIK do Przelewy24
        ↓
JOKUS trzyma w escrow do potwierdzenia odbioru
        ↓
Po potwierdzeniu (15 min):
  - Sprzedawca dostaje 250 - 5% prowizja = 237.50 zł
  - Jokusor (dostawca) dostaje 5 - 8% prowizja = 4.60 zł
  - JOKUS zatrzymuje: 12.50 + 0.40 = 12.90 zł
```

### Moduł professional (np. hydraulik, 100 zł pilnowanie + 150 zł hydraulik)

```
Strumień 1: Mieszkaniec → JOKUS (z góry, 100 zł)
  - Jokusor dostaje 92 zł (-8% prowizja)
  - JOKUS: 8 zł

Strumień 2: Mieszkaniec → Hydraulik (po fakcie, 150 zł)
  - Hydraulik dostaje 150 zł

Strumień 3: Hydraulik → JOKUS (po fakcie, prowizja 10%)
  - JOKUS: 15 zł

Total przychód JOKUS: 8 + 15 = 23 zł
Total przychód jokusora: 92 zł
Total przychód hydraulika: 135 zł (150 - 10% prowizja)
```

## Onboarding jokusora — proces

```
1. Złożenie wniosku przez /franchise
2. Rozmowa wstępna (telefon, 30 min) — Michał weryfikuje
3. Dokumenty (KRK, dowody, dane firmowe)
4. Weryfikacja (3-5 dni)
5. Podpisanie umowy (e-podpis lub osobiście)
6. Szkolenie online (2-4h)
7. Pierwsze zlecenie testowe (z opiekunem)
8. Aktywacja konta — gotowy do pracy
```

Całkowity czas: 1-2 tygodnie od wniosku do pierwszego zlecenia.

## Wsparcie wzrostu jokusora

Po osiągnięciu pewnych progów jokusor dostaje benefity:

- **50 zleceń:** ranking osiedla widoczny w aplikacji
- **100 zleceń:** odznaka "TOP", priorytet w przydziale
- **200 zleceń:** zniżka na abonament -50% przez 3 miesiące
- **500 zleceń:** propozycja zostania "team leaderem" (rekrutacja pomocników)

## Zakończenie współpracy

Po rozwiązaniu umowy:
- Jokusor usuwa logo i materiały MIGMIG
- Dane historyczne zleceń: anonimizowane po 90 dniach (RODO)
- Mieszkańcy z osiedla jokusora są ponownie przydzielani do innego (lub dostają informację o czasowym braku obsługi)
- Wypłata salda + ostatniej faktury w 14 dni
