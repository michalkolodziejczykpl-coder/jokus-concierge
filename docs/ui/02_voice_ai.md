# AI głosowe — architektura i pula odpowiedzi

## Zasada nadrzędna

**AI to wypełniacz formularza, nie chatbot.**

Nie generujemy odpowiedzi swobodnie (jak ChatGPT). Mamy skończoną pulę odpowiedzi i każda komenda głosowa musi pasować do jednego z predefiniowanych intentów, albo użytkownik dostaje fallback.

To minimalizuje:

- Ryzyko halucynacji
- Ryzyko powiedzenia czegoś nieautoryzowanego
- Koszt API (mniej tokenów)
- Latencję

## Architektura

```
User mówi  ─→  Whisper API  ─→  text-embedding-3-small  ─→  pgvector cosine search
                                                                       │
                                                                       ▼
                                                          intent matched? (>0.75)
                                                                       │
                                                          ┌─────── tak ─────┐
                                                          │                  │
                                                          ▼                  ▼
                                              extract parameters        fallback:
                                              (LLM few-shot)            "Mogę pomóc z..."
                                                          │
                                                          ▼
                                              Pre-wypełnij formularz
                                              Pokaż użytkownikowi do akceptacji
```

## Pula odpowiedzi (intent catalog)

Każdy moduł ma listę predefiniowanych intentów w tabeli `ai_intents`.

Struktura intent:

```typescript
type AiIntent = {
  id: string;
  module_id: string;            // FK do modules
  intent_key: string;           // identyfikator np. 'order_dog_walking_30'
  sample_questions: string[];   // 5-15 wariantów ludzkim językiem
  embedding: vector(1536);      // wygenerowany z agregatu sample_questions
  canonical_response: string;   // jednolita odpowiedź
  follow_up_action: ActionType; // co zrobić po match
  action_params: object;        // parametry dla akcji
};

type ActionType =
  | 'open_order_form'   // otwórz formularz modułu
  | 'show_pricing'      // pokaż cennik
  | 'show_help'         // wyświetl FAQ
  | 'redirect_to_support' // przekieruj do supportu (sytuacje krytyczne)
  | 'cancel_order'      // anuluj aktywne zamówienie
  | 'check_status';     // sprawdź status zamówienia
```

## Przykładowe intenty

### Moduł: dog-walking

**intent_key:** `order_dog_walking_30`

- sample_questions:
  - "wyprowadź mojego psa"
  - "potrzebuję spaceru z psem"
  - "kto wyjdzie z moim psem"
  - "wyprowadzę psa na 30 minut"
  - "spacer 30 minut dla Reksia"
  - "psa trzeba wyprowadzić"
- canonical_response: "Mogę zorganizować spacer 30-minutowy. Sprawdzę najbliższy slot."
- follow_up_action: `open_order_form`
- action_params: `{ module: 'dog-walking', walk_duration: '30min' }`

**intent_key:** `order_dog_walking_60`

- sample_questions:
  - "wyprowadź psa na godzinę"
  - "długi spacer 60 minut"
  - "spacer godzina z psem"
- canonical_response: "Zorganizuję 60-minutowy spacer."
- action_params: `{ module: 'dog-walking', walk_duration: '60min' }`

**intent_key:** `dog_walking_pricing`

- sample_questions:
  - "ile kosztuje wyprowadzenie psa"
  - "cena spaceru z psem"
  - "po ile spacery"
- canonical_response: "Spacer 30-minutowy to 25 zł, godzinny 40 zł. Chcesz zamówić?"
- follow_up_action: `show_pricing`

### Moduł: pharmacy

**intent_key:** `order_pharmacy_e_prescription`

- sample_questions:
  - "wykup receptę"
  - "mam e-receptę do realizacji"
  - "potrzebuję leków z apteki na receptę"
  - "kod do recepty"
- canonical_response: "Mogę wykupić e-receptę. Podaj kod recepty."
- action_params: `{ module: 'pharmacy', prescription_type: 'e-recepta' }`

**intent_key:** `order_pharmacy_otc`

- sample_questions:
  - "kup mi paracetamol"
  - "potrzebuję ibupromu"
  - "leki bez recepty"
- canonical_response: "Apteka, leki bez recepty. Co mam kupić?"
- action_params: `{ module: 'pharmacy', prescription_type: 'OTC' }`

### Moduł: grocery-shopping

**intent_key:** `order_groceries`

- sample_questions:
  - "zrób zakupy"
  - "potrzebuję zakupów"
  - "kupisz mi mleko i chleb"
  - "lista zakupów"
- canonical_response: "Zakupy spożywcze. Podaj listę produktów lub sklep."
- action_params: `{ module: 'grocery-shopping' }`

### Cross-module: status

**intent_key:** `check_my_orders`

- sample_questions:
  - "co z moim zamówieniem"
  - "gdzie jest jokusor"
  - "czy pies już wraca"
  - "kiedy paczka"
- canonical_response: "Sprawdzam Twoje aktywne zamówienia."
- follow_up_action: `check_status`

**intent_key:** `cancel_order`

- sample_questions:
  - "anuluj zamówienie"
  - "rezygnuję"
  - "nie potrzebuję już"
- canonical_response: "Chcesz anulować aktywne zamówienie? Pokażę listę."
- follow_up_action: `cancel_order`

## Algorytm matching

```typescript
async function recognizeIntent(text: string): Promise<IntentMatch | null> {
  // 1. Wygeneruj embedding z tekstu
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.toLowerCase().trim()
  });

  // 2. Vector similarity search w pgvector
  const { data: matches } = await supabase.rpc('match_intents', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.75,
    match_count: 3
  });

  if (!matches || matches.length === 0) {
    return null; // fallback
  }

  const best = matches[0];

  // 3. Ekstrahuj parametry z tekstu (drugi call do LLM)
  const extracted = await extractParameters(text, best.intent_key);

  return {
    intent: best,
    confidence: best.similarity,
    extracted_params: extracted
  };
}
```

Funkcja `match_intents` w Postgres:

```sql
CREATE OR REPLACE FUNCTION match_intents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 3
) RETURNS TABLE (
  id uuid,
  intent_key text,
  module_slug text,
  canonical_response text,
  follow_up_action text,
  action_params jsonb,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    ai.id,
    ai.intent_key,
    m.slug AS module_slug,
    ai.canonical_response,
    ai.follow_up_action,
    ai.action_params,
    1 - (ai.embedding <=> query_embedding) AS similarity
  FROM ai_intents ai
  JOIN modules m ON m.id = ai.module_id
  WHERE 1 - (ai.embedding <=> query_embedding) > match_threshold
  ORDER BY ai.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Ekstrakcja parametrów

Po identyfikacji intentu wykonujemy drugi call do LLM (np. GPT-4o-mini, tanio i dokładnie) z few-shot prompt:

```typescript
const prompt = `
Wyciągnij parametry z polskiego zapytania użytkownika.
Intent: ${intentKey}
Oczekiwane pola: ${expectedFields.join(', ')}

Przykłady:
"wyprowadź Reksia na pół godziny o 15" →
  {"dog_name": "Reksio", "walk_duration": "30min", "scheduled_at": "today 15:00"}

"60 minut z Burkiem jutro rano" →
  {"dog_name": "Burek", "walk_duration": "60min", "scheduled_at": "tomorrow 09:00"}

Tekst użytkownika: "${userText}"
Odpowiedz tylko JSON.
`;

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' }
});

return JSON.parse(response.choices[0].message.content);
```

Koszt: GPT-4o-mini to $0.15/1M input tokenów, $0.60/1M output. Średnie zapytanie ~200 input + 50 output = $0.00003 + $0.00003 = $0.00006 = ~0.0003 zł. **Tysiąc zapytań = 30 groszy.**

## Fallback gdy AI nie zrozumie

Confidence < 0.75 lub brak matchów:

```
"Nie do końca zrozumiałem.

Mogę pomóc z:
• Wyprowadzanie psa
• Zakupy spożywcze
• Odbiór paczki

[Pokaż wszystkie kafelki]
[Spróbuj jeszcze raz]"
```

System pokazuje 3 najpopularniejsze intenty (na podstawie statystyk z `voice_query_log`).

## Stałe komendy systemowe (zawsze działają)

Niezależnie od pgvector, te komendy mają pierwszeństwo:

```typescript
const SYSTEM_COMMANDS = {
  'pomoc|help|nie wiem': () => showHelpModal(),
  'gdzie.*kuri|gdzie.*jokusor|status': () => showActiveOrders(),
  anuluj: () => showCancelMenu(),
  'zamknij|wyjdź|wróć': () => closeVoiceModal(),
  'admin|reklamacja': () => contactSupport()
};
```

Regex match przed odpaleniem AI — oszczędność czasu i pewność.

## Onboarding głosowy

Pierwszy raz user otwiera mikrofon:

```
"Witaj! Jestem MIGMIG AI. Mogę Ci pomóc szybciej zamówić usługę.

Po prostu powiedz, co potrzebujesz — np.:
• "Wyprowadź mojego psa"
• "Zrób zakupy w Biedronce"
• "Odbierz paczkę z paczkomatu"

[Zacznij mówić] [Pokaż kafelki]"
```

## Aktualizacja puli intentów

Admin w panelu `/admin/ai-intents` może:

- Dodać nowy intent
- Edytować sample_questions
- Zatwierdzić canonical_response
- **Po zapisie:** system automatycznie regeneruje embedding (background job)

Source of truth dla pytań mieszkańców: `voice_query_log`. Co tydzień admin analizuje:

- Najczęstsze zapytania bez matchu (kandydaci do nowych intentów)
- Najczęstsze zapytania z niskim confidence (kandydaci do dodania jako sample_questions)
- Zapytania, które nie skonwertowały do zamówienia (problemy UX)

## Polski język — wyzwania

### Liczebniki

Whisper transkrybuje "trzydzieści" jako liczbę słów. Trzeba normalizować:

- "trzydzieści minut" → "30 minut"
- "pół godziny" → "30 minut"
- "godzina" → "60 minut"

### Polskie znaki

Whisper sobie radzi z polskim ą, ę, ż, ś, ć etc. Testowane na akcentach śląskim, kresowym i poznańskim — bez błędów.

### Slang i potoczne wyrażenia

Sample_questions muszą zawierać warianty:

- "wykup" / "zrealizuj" / "zrób" (recepta)
- "zrobisz mi" / "zrobisz nam" / "zrób"
- "psa" / "pieska" / "kundla"

## Latencja end-to-end

| Krok                   | Czas    |
| ---------------------- | ------- |
| Nagranie 5s głosu      | 5s      |
| Upload do Whisper      | 0.3s    |
| Whisper transkrypcja   | 1.5s    |
| Embedding query        | 0.2s    |
| pgvector search        | 0.05s   |
| GPT-4o-mini extraction | 0.8s    |
| Render formularza      | 0.1s    |
| **Total**              | **~8s** |

Cel: <10s. Akceptowalne dla user experience (porównywalne do wpisania ręcznego).

## Bodycam — zlecenia z weryfikacją

Niektóre moduły mogą mieć opcję bodycam (np. „Tytoń i alkohol" — sprawdzenie wieku przez jokusora, „Auto do serwisu" — zabezpieczenie obu stron).

Po opłaceniu, jokusor ma w aplikacji przycisk „Włącz nagrywanie". Nagranie zapisuje się lokalnie i wysyła do Supabase Storage po zakończeniu zlecenia (encrypted, dostęp tylko dla obu stron + admina).

To opcjonalny dodatek (+5 zł), nie domyślny.
