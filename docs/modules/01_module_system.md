# System modułowy

## Koncepcja

Moduł to typ usługi w systemie. Admin może go włączyć lub wyłączyć — globalnie lub dla wybranych osiedli. Mieszkaniec widzi w aplikacji tylko moduły aktywne dla swojego adresu.

## Trzy poziomy aktywacji

1. **Definicja modułu (globalna)** — w tabeli `modules`. Tu jest specyfikacja modułu (nazwa, ikona, cennik bazowy, pytania AI).
2. **Aktywacja per osiedle** — w tabeli `module_activations`. Admin decyduje, które moduły są dostępne na którym osiedlu.
3. **Akceptacja przez jokusora** — w tabeli `jokusor_modules`. Jokusor zaznacza, które z aktywnych modułów świadczy (może np. nie przyjmować transportu psów, jeśli jest uczulony).

Wynik: na ekranie mieszkańca pokazuje się moduł, jeśli **wszystkie trzy** są spełnione.

## Struktura danych modułu

```typescript
type Module = {
  id: string;
  slug: string; // 'dog-walking', 'package-pickup', 'plumber'
  name: string; // 'Wyprowadzanie psa'
  description: string;
  category: ModuleCategory; // enum
  icon_name: string; // ikona z Lucide
  base_price: number; // 25.00 zł
  price_unit: PriceUnit; // 'fixed' | 'hourly' | 'per_km' | 'percent'
  estimated_duration_min: number; // 30
  requires_pickup: boolean; // czy potrzebny punkt odbioru (sklep, apteka)
  custom_fields: CustomField[]; // dodatkowe pola formularza
  ai_intents: AiIntent[]; // pula odpowiedzi AI dla tego modułu
  is_global: boolean; // czy admin może w ogóle włączyć
  created_at: timestamp;
};

type ModuleCategory =
  | 'delivery' // odbiór i dostawa
  | 'shopping' // zakupy
  | 'transport' // transport
  | 'home_pet' // dom i zwierzęta
  | 'errands' // sprawy urzędowe
  | 'professional' // przypilnuj fachowca (NOWA KATEGORIA)
  | 'marketplace'; // dostawa z mini-marketplace (NOWA KATEGORIA)

type CustomField = {
  key: string; // 'shopping_list'
  label: string; // 'Lista zakupów'
  type: 'text' | 'photo' | 'select' | 'number';
  required: boolean;
  options?: string[]; // dla select
};
```

## Tabele bazy

```sql
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  icon_name text,
  base_price numeric(10,2) NOT NULL,
  price_unit text NOT NULL DEFAULT 'fixed',
  estimated_duration_min integer NOT NULL,
  requires_pickup boolean NOT NULL DEFAULT false,
  custom_fields jsonb NOT NULL DEFAULT '[]',
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE module_activations (
  module_id uuid REFERENCES modules(id),
  estate_id uuid REFERENCES estates(id),
  active boolean NOT NULL DEFAULT true,
  price_override numeric(10,2),
  activated_at timestamptz DEFAULT now(),
  activated_by uuid REFERENCES users(id),
  PRIMARY KEY (module_id, estate_id)
);

CREATE TABLE jokusor_modules (
  jokusor_id uuid REFERENCES users(id),
  module_id uuid REFERENCES modules(id),
  accepts boolean NOT NULL DEFAULT true,
  custom_price numeric(10,2),
  PRIMARY KEY (jokusor_id, module_id)
);
```

## Panel admina — zarządzanie modułami

### Widok główny: `/admin/modules`

```
┌──────────────────────────────────────────────────────────┐
│ Moduły                              [+ Dodaj nowy moduł] │
├──────────────────────────────────────────────────────────┤
│ Kategoria: [Wszystkie ▼]   Status: [Wszystkie ▼]         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🐕 Wyprowadzanie psa                          [Edytuj]   │
│ Globalnie: ●   Aktywne na: 8/12 osiedli                  │
│ Zlecenia w tym miesiącu: 234   |   Średnia ocena: 4.8    │
│                                                          │
│ 📦 Odbiór paczki                              [Edytuj]   │
│ Globalnie: ●   Aktywne na: 12/12 osiedli                 │
│ Zlecenia w tym miesiącu: 1842  |   Średnia ocena: 4.9    │
│                                                          │
│ 🔧 Przypilnuj hydraulika                      [Edytuj]   │
│ Globalnie: ○ DRAFT   Aktywne na: 0/12 osiedli            │
│ Brak danych — moduł jeszcze nieuruchomiony               │
└──────────────────────────────────────────────────────────┘
```

### Widok edycji: `/admin/modules/[id]`

```
┌──────────────────────────────────────────────────────────┐
│ Edycja: Wyprowadzanie psa                                │
├──────────────────────────────────────────────────────────┤
│ Slug: dog-walking                                        │
│ Nazwa wyświetlana: [Wyprowadzanie psa            ]       │
│ Kategoria: [Dom i zwierzęta ▼]                           │
│ Ikona: [🐕 ▼]                                            │
│ Cena bazowa: [25.00] zł                                  │
│ Jednostka: [Stała kwota ▼]                               │
│ Szacowany czas: [30] minut                               │
│ Wymaga punktu odbioru: [✓] Nie                           │
│                                                          │
│ Custom fields:                                           │
│ [+] dog_name (text, wymagane)                            │
│ [+] dog_photo (photo, opcjonalne)                        │
│ [+] walk_duration (select: 30min/60min)                  │
│ [+] special_instructions (text, opcjonalne)              │
│                                                          │
│ Pula odpowiedzi AI:                                      │
│ [+] intent: cena_30min                                   │
│     pytania: "ile kosztuje 30 minut", "cena spaceru..."  │
│     odpowiedź: "Spacer 30-minutowy to 25 zł..."          │
│ [+] intent: cena_60min                                   │
│ [+] intent: warunki_psy_agresywne                        │
│                                                          │
│ Aktywacja per osiedle:                                   │
│ [✓] Krzyki         (Wrocław)    cena: 25 zł              │
│ [✓] Stare Miasto   (Wrocław)    cena: 30 zł (override)   │
│ [✗] Fabryczna      (Wrocław)    nieaktywne               │
│ [+ Dodaj osiedle]                                        │
│                                                          │
│ [Zapisz zmiany]   [Archiwizuj moduł]                     │
└──────────────────────────────────────────────────────────┘
```

## Propozycje modułów od mieszkańców

Mieszkaniec może zgłosić propozycję:

```
┌──────────────────────────────────────────────────────────┐
│ Brakuje Ci jakiejś usługi?                               │
├──────────────────────────────────────────────────────────┤
│ Nazwa usługi: [Mycie okien                       ]       │
│ Opis: [Mycie okien w mieszkaniu, raz na kwartał]         │
│ Jak często byś korzystał? [Co kwartał ▼]                 │
│ Ile byś zapłacił? [50-100 zł ▼]                          │
│                                                          │
│ [Wyślij propozycję]                                      │
└──────────────────────────────────────────────────────────┘
```

Propozycje zapisywane są w tabeli `module_proposals`. Mieszkańcy mogą głosować na cudze propozycje (👍). Admin widzi posortowane po liczbie głosów + częstotliwości użycia.

```sql
CREATE TABLE module_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_by uuid REFERENCES users(id),
  name text NOT NULL,
  description text,
  expected_frequency text,
  expected_price_range text,
  votes_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected | implemented
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE module_proposal_votes (
  proposal_id uuid REFERENCES module_proposals(id),
  user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (proposal_id, user_id)
);
```

## Algorytm wyświetlania modułów dla mieszkańca

```typescript
async function getModulesForResident(residentId: string, address: Address) {
  // 1. Znajdź osiedle na podstawie adresu (PostGIS ST_Contains)
  const estate = await findEstateForAddress(address);
  if (!estate) return []; // poza obsługiwaną strefą

  // 2. Znajdź wszystkie aktywne moduły na tym osiedlu
  const activeModules = await supabase
    .from('module_activations')
    .select('module:modules(*), price_override')
    .eq('estate_id', estate.id)
    .eq('active', true);

  // 3. Filtruj te, dla których jest przynajmniej jeden jokusor
  //    akceptujący moduł i obsługujący adres
  const availableModules = [];
  for (const ma of activeModules) {
    const hasJokusor = await supabase.rpc('has_available_jokusor', {
      p_module_id: ma.module.id,
      p_estate_id: estate.id,
      p_address: address.point
    });
    if (hasJokusor) {
      availableModules.push({
        ...ma.module,
        effective_price: ma.price_override || ma.module.base_price
      });
    }
  }

  return availableModules;
}
```

## Co zrobiłem dla mieszkańca poza zasięgiem

Jeśli adres nie pasuje do żadnego osiedla LUB osiedle nie ma żadnego jokusora:

```
┌──────────────────────────────────────────────────────────┐
│ 🚧 MIGMIG jeszcze nie dotarł na Twoje osiedle            │
│                                                          │
│ Pracujemy nad rozszerzaniem sieci. Zostaw maila —        │
│ powiadomimy Cię, gdy uruchomimy usługi w Twojej okolicy. │
│                                                          │
│ Email: [______________________]                          │
│ [Powiadom mnie]                                          │
│                                                          │
│ Chcesz zostać jokusorem na swoim osiedlu?                │
│ [Zostań franczyzobiorcą →]                               │
└──────────────────────────────────────────────────────────┘
```

To także narzędzie marketingowe: każdy taki sygnał to lead biznesowy.
