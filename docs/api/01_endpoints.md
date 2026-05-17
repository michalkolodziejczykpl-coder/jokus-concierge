# API endpoints

Konwencja: Next.js App Router. Wszystkie endpointy pod `src/app/api/`.

W większości przypadków preferujemy **Server Actions** zamiast API routes (typowane, mniejsza powierzchnia ataku). API routes używamy tylko gdy:
- Wymagana jest aplikacja zewnętrzna (webhook, RN, integracje)
- Streaming/SSE
- Inny serwer wywołuje endpoint

## Auth

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| GET | `/api/auth/callback` | OAuth callback (Google/FB/Apple) | – |
| POST | `/api/auth/signout` | Wylogowanie | session |
| POST | `/api/auth/refresh` | Refresh tokenu | session |

Wszystkie pozostałe operacje auth (login email, magic link, register) idą przez Supabase Auth bezpośrednio z klienta (`@supabase/ssr`).

## Orders (zamówienia)

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| POST | `/api/orders` | Nowe zamówienie (z kafelka lub z głosu) | resident |
| GET | `/api/orders` | Lista własnych zamówień | resident/jokusor |
| GET | `/api/orders/[id]` | Szczegóły zamówienia | party |
| PATCH | `/api/orders/[id]` | Edycja drafta | resident (draft) |
| DELETE | `/api/orders/[id]` | Anuluj | resident (do `accepted`) |
| POST | `/api/orders/[id]/accept` | Jokusor akceptuje | jokusor |
| POST | `/api/orders/[id]/reject` | Jokusor odrzuca | jokusor |
| POST | `/api/orders/[id]/start` | Jokusor wyrusza | jokusor |
| POST | `/api/orders/[id]/checkpoint` | Checkpoint (arrived_pickup, completed itp.) | jokusor |
| POST | `/api/orders/[id]/rate` | Mieszkaniec ocenia | resident |
| POST | `/api/orders/[id]/tip` | Napiwek | resident |
| POST | `/api/orders/[id]/dispute` | Zgłoś reklamację | party |

### Przykład: POST /api/orders

Request body (zod schema w `lib/utils/validators.ts`):
```typescript
{
  module_slug: string;            // 'dog-walking'
  address_id: string;             // UUID
  scheduled_at: string;           // ISO datetime
  custom_data: Record<string, unknown>; // dane z custom_fields modułu
  bodycam_enabled?: boolean;
  notes?: string;
  voice_session_id?: string;      // jeśli z głosu — link do zapisu transkrypcji
}
```

Response:
```typescript
{
  order_id: string;
  status: 'hold';                 // czeka 90s na płatność
  total_price: number;
  hold_expires_at: string;        // ISO
  payment_session: {
    provider: 'przelewy24';
    redirect_url: string;
    session_id: string;
  };
}
```

Logika:
1. Walidacja zod
2. Znajdź adres → ustal estate
3. Sprawdź czy moduł aktywny dla estate
4. Wywołaj `slot-finder` (Edge Function) → najbliższy dostępny slot
5. Insert do `time_slots` z `status='hold'`, TTL 90s
6. Insert do `orders` z `status='hold'`
7. Insert do `order_events` z `event_type='created'`
8. Stwórz sesję Przelewy24
9. Zwróć redirect_url

## Slots

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| GET | `/api/slots/available?module_slug=...&address_id=...` | Lista wolnych slotów na dziś/jutro | resident |
| POST | `/api/slots/hold` | Zarezerwuj slot na 90s | resident |
| DELETE | `/api/slots/hold/[id]` | Zwolnij hold | resident |

## Tracking

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| POST | `/api/tracking/update` | Jokusor wysyła GPS (broadcast) | jokusor |
| GET | `/api/tracking/order/[id]` | SSE stream pozycji jokusora | resident/admin |

### Tracking update

Body:
```typescript
{
  order_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}
```

Endpoint **NIE zapisuje** do bazy. Tylko publikuje do kanału Supabase Realtime:
```typescript
await supabase.channel(`tracking:order:${orderId}`).send({
  type: 'broadcast',
  event: 'location',
  payload: { lat, lng, heading, ts: Date.now() }
});
```

## AI (głos)

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| POST | `/api/ai/transcribe` | Audio → tekst (Whisper) | session |
| POST | `/api/ai/intent` | Tekst → intent + parametry (pgvector) | session |

### Intent recognition

Body:
```typescript
{ text: string }
```

Response:
```typescript
{
  intent_id: string | null;
  intent_key: string | null;       // 'order_dog_walking'
  module_slug: string | null;      // 'dog-walking'
  confidence: number;              // 0-1
  extracted_params: Record<string, unknown>;
  // {dog_name: "Reksio", walk_duration: "30min"}
  fallback_suggestions?: string[];
  // gdy confidence < 0.75
}
```

Logika:
1. Wygeneruj embedding z tekstu (OpenAI `text-embedding-3-small`)
2. Vector similarity search w `ai_intents` (cosine, próg 0.75)
3. Jeśli match → wyciągnij parametry z tekstu (LLM z few-shot examples)
4. Zaloguj w `voice_query_log`
5. Zwróć

## Marketplace

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| GET | `/api/marketplace/listings` | Lista ogłoszeń (filtry) | session |
| POST | `/api/marketplace/listings` | Nowe ogłoszenie | session |
| GET | `/api/marketplace/listings/[id]` | Szczegóły | session |
| PATCH | `/api/marketplace/listings/[id]` | Edycja własnego | seller |
| DELETE | `/api/marketplace/listings/[id]` | Usuń | seller |
| POST | `/api/marketplace/listings/[id]/buy` | Kup z dostawą MIGMIG | buyer |
| POST | `/api/marketplace/listings/[id]/report` | Zgłoś | session |
| POST | `/api/marketplace/listings/[id]/messages` | Wyślij wiadomość | session |
| GET | `/api/marketplace/listings/[id]/messages` | Pobierz wątek | participants |
| POST | `/api/marketplace/purchases/[id]/confirm` | Kupujący potwierdza odbiór (escrow → seller) | buyer |
| POST | `/api/marketplace/purchases/[id]/dispute` | Reklamacja | buyer |

## Admin

| Metoda | Endpoint | Opis | Auth |
|--------|----------|------|------|
| GET | `/api/admin/stats` | KPI dashboard | admin |
| GET | `/api/admin/modules` | Lista modułów | admin |
| POST | `/api/admin/modules` | Nowy moduł | admin |
| PATCH | `/api/admin/modules/[id]` | Edycja | admin |
| POST | `/api/admin/modules/[id]/activate` | Aktywuj dla osiedla | admin |
| GET | `/api/admin/estates` | Lista osiedli | admin |
| POST | `/api/admin/estates` | Nowe osiedle (z polygonem) | admin |
| GET | `/api/admin/jokusors/pending` | Wnioski o franczyzę | admin |
| POST | `/api/admin/jokusors/[id]/approve` | Zatwierdź jokusora | admin |
| POST | `/api/admin/jokusors/[id]/suspend` | Zawieś | admin |
| GET | `/api/admin/disputes` | Reklamacje | admin |
| POST | `/api/admin/disputes/[id]/resolve` | Rozstrzygnij | admin |
| GET | `/api/admin/professionals` | Zaufani fachowcy | admin |
| POST | `/api/admin/professionals` | Dodaj fachowca | admin |

## Webhooks

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/webhooks/przelewy24` | Notyfikacja płatności |
| POST | `/api/webhooks/supabase-auth` | Hook po rejestracji (welcome email itp.) |

### Przelewy24 webhook

```typescript
{
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  currency: 'PLN';
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;  // CRC32 weryfikacja
}
```

Logika:
1. Weryfikacja sygnatury (CRC)
2. Idempotency check (czy ten sessionId już procesowany)
3. Update `payments.status`
4. Update `orders.status` z `hold` na `pending` (czeka na akceptację jokusora)
5. Push notification do dostępnych jokusorów
6. Insert `order_events` z `event_type='paid'`

## Rate limiting

Limity per IP per godzina:
- `/api/auth/*`: 30 req/h
- `/api/orders`: 60 req/h
- `/api/marketplace/listings` (POST): 10 req/h
- `/api/ai/*`: 100 req/h (Whisper jest drogi)
- Inne: 1000 req/h

Implementacja: Upstash Redis (lub Supabase + Postgres jeśli małe wolumeny).

## Error handling

Format błędów (zgodny z RFC 7807):
```typescript
{
  type: string;      // 'https://migmig.pl/errors/slot-not-available'
  title: string;     // 'Brak dostępnych slotów'
  status: number;    // 409
  detail: string;    // user-facing message po PL
  instance?: string; // konkretny URI błędu
  errors?: Record<string, string[]>; // walidacyjne pola
}
```

Kody:
- 200/201: OK
- 400: Walidacja zod
- 401: Brak sesji
- 403: Brak uprawnień (rola/RLS)
- 404: Zasób nie istnieje
- 409: Konflikt (slot zajęty, ogłoszenie sprzedane)
- 422: Logika biznesowa (mieszkaniec poza zasięgiem)
- 429: Rate limit
- 500: Server error (zaloguj w Sentry)
