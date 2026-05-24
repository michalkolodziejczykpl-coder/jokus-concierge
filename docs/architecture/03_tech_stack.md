# Stack techniczny

## Frontend

### Next.js 14 (App Router)

- Server Components jako default (mniej JS w przeglądarce)
- Client Components tylko gdy potrzebujemy interakcji
- Server Actions dla mutacji (zastępują większość API routes)
- Route Groups `(group)` dla separacji layoutów per rola
- Middleware dla auth + role-based routing

### TypeScript 5.x

- `strict: true` w `tsconfig.json`
- Wszystkie typy bazy generowane przez `npx supabase gen types typescript`
- Zod schemas jako pojedyncze źródło prawdy dla walidacji + typów

### Tailwind CSS 3.x

- Mobile-first (PWA musi być doskonała na telefonie)
- Custom kolory marki w `tailwind.config.ts`:
  ```ts
  colors: {
    migmig: {
      primary: '#1D9E75',   // teal-600
      secondary: '#0F6E56', // teal-800
      accent: '#EF9F27',    // amber-500
    }
  }
  ```
- Komponenty UI własne (bez gotowej biblioteki — kontrola nad PWA size)

### State management

- **Zustand** dla globalnego stanu klienta (draft zamówienia, sesja głosowa)
- **TanStack Query** dla danych z serwera (cache, optimistic updates)
- Brak Redux — niepotrzebny przy Server Components

## Backend

### Supabase (managed PostgreSQL)

**Region:** Frankfurt (eu-central-1) — najbliżej Polski, RODO-friendly.

**Plan:** Pro ($25/mies start) — Free plan nie ma:

- Daily backups (krytyczne dla biznesu)
- 7-day point-in-time recovery
- Bez ograniczeń na Edge Functions

**Extensions wymagane:**

- `pgvector` — embeddings dla AI intent recognition
- `btree_gist` — constraint EXCLUDE dla slotów czasowych
- `postgis` — operacje geograficzne (polygon zasięgu jokusora, czy adres w strefie)

### Edge Functions (Deno runtime)

Cztery funkcje:

1. **`ai-intent-recognition`** — przyjmuje transkrypcję głosu, zwraca intent + parametry
2. **`slot-finder`** — wyszukuje wolne sloty dla zamówienia (cięższe obliczenia → Edge zamiast App Router)
3. **`tracking-broadcast`** — przekazuje aktualizacje GPS z jokusora do subskrybentów (z throttlingiem)
4. **`przelewy24-webhook`** — odbiera notyfikacje płatności

### Realtime

Supabase Realtime używa PostgreSQL replication + WebSocket. Trzy typy subskrypcji:

```typescript
// Postgres Changes (zmiany w tabeli)
supabase.channel('orders-changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, ...)

// Broadcast (krótkie wiadomości P2P, np. GPS)
supabase.channel('tracking:order:abc-123')
  .on('broadcast', { event: 'location' }, ...)

// Presence (kto jest online, np. „jokusor pisze...")
supabase.channel('chat:order:abc-123')
  .on('presence', { event: 'sync' }, ...)
```

### Storage

Trzy buckety:

- `avatars` — public read, write tylko własne
- `marketplace-listings` — public read, write tylko własne, max 10MB per file
- `invoices` — private (tylko właściciel + admin), generowane przez backend

## Usługi zewnętrzne

### Mapbox (mapy)

**Dlaczego Mapbox a nie Google Maps:**

- 50 000 darmowych load'ów map miesięcznie (Google: 28 000)
- Directions API: $0.50/1000 requests (Google: $5/1000)
- Distance Matrix: $1/1000 elements (Google: $5/1000)
- Lepsza customizacja stylu (branding MIGMIG)
- Można self-hostować tiles dla offline

**Co używamy:**

- Mapbox GL JS — wyświetlanie map (mapa zasięgu, mapa zamówień admina, live tracking)
- Directions API — trasa + ETA dla live tracking
- Distance Matrix API — czas dojazdu w algorytmie slotów
- Geocoding API — wprowadzanie adresu z autocomplete

**Konto:** https://account.mapbox.com — token w `.env`

### OpenAI (AI głosowe)

**Whisper API** — transkrypcja głosu PL

- Cena: $0.006/minutę
- Latencja: ~2-3s dla 30s nagrania
- Jakość PL: bardzo dobra (testowane)

**text-embedding-3-small** — embeddings dla intent recognition

- Cena: $0.02/1M tokenów (bardzo tanio)
- Wymiary: 1536 (kompatybilne z pgvector)
- Każda predefiniowana odpowiedź ma swój embedding w bazie

**Alternatywa dla offline:** lokalny model Whisper w aplikacji RN (większy bundle, ale brak kosztu API). Decyzja po MVP.

### Przelewy24 (płatności)

- BLIK (główne narzędzie — 90% Polaków używa)
- Karty (Visa, Mastercard)
- Apple Pay / Google Pay
- Przelew klasyczny (fallback)

Webhook na `/api/webhooks/przelewy24` z idempotency key.

Z poprzedniego projektu (JOKUS Concierge) masz już doświadczenie z integracją — używamy tych samych kluczy.

### Web Push (notyfikacje)

- Firebase Cloud Messaging (FCM) dla Android/Chrome
- Apple Push Notification Service (APNS) dla iOS — Safari na iOS 16.4+ obsługuje
- VAPID keys generowane lokalnie

### Sentry (error tracking)

- Free plan: 5000 errors/miesiąc — wystarczy na start
- Source maps uploadowane przy build w CI

### PostHog (analytics)

**Self-hosted** (na Cyberfolks VPS, którym już dysponujesz) zamiast cloud:

- Zero kosztów ($0 vs $450/mies w cloud przy 10k MAU)
- Dane zostają w Polsce (RODO)
- Pełna kontrola

## Hosting i CI/CD

### Vercel (frontend)

- Free tier wystarczy na start (100GB bandwidth, unlimited builds)
- Po przekroczeniu: Pro $20/mies
- Preview deployments dla każdego PR
- Edge functions globalnie (low latency)

### Supabase (backend)

- Pro plan $25/mies
- Auto-scaling do 8GB RAM przy ruchu

### GitHub Actions (CI)

- Lint + typecheck na każdy PR
- E2E testy (Playwright) na merge do `main`
- Auto-deploy do Vercel przez integrację

## Szacowane koszty miesięczne

### Start (0-500 użytkowników)

- Vercel: $0 (Hobby plan)
- Supabase: $25 (Pro)
- Mapbox: $0 (free tier)
- OpenAI: ~$10 (Whisper + embeddings)
- Domena migmig.pl: ~$15/rok = $1.25/mies
- **Razem: ~$36/mies (~145 zł)**

### Skala (3000-5000 użytkowników)

- Vercel Pro: $20
- Supabase Pro + extras: $50-80
- Mapbox: ~$30
- OpenAI: ~$50
- Sentry: $26 (Team plan)
- **Razem: ~$180-220/mies (~720-900 zł)**

### Skala duża (10 000+ użytkowników)

- Vercel Enterprise: negocjowane
- Supabase Team: $599
- Mapbox: ~$200
- OpenAI: ~$200
- **Razem: ~$1500-2500/mies (~6-10k zł)**

W modelu hybrydowym (99 zł abonament + 8% prowizja) przy 30 jokusorach i średnim obrocie 5000 zł/jokusor/mies → przychód 30 × 99 + 30 × 5000 × 0.08 = 2970 + 12000 = **14 970 zł/mies**. Coverage kosztów techniki: 100x.
