# JOKUS Concierge

Platforma franczyzowa usług osiedlowych. JOKUS Sp. z o.o., Wrocław.

- Marka: **JOKUS**, domena: jokus.pl
- Etap 1: PWA (Next.js 14 + Supabase)
- Etap 2: React Native (Android + iOS) — po osiągnięciu 3000 DAU
- Język: UI po polsku, kod i komentarze po angielsku

## Setup

```bash
npm install
cp .env.example .env.local
# wypełnij .env.local kluczami z Supabase / Mapbox / OpenAI / Przelewy24
npm run dev
```

Po pierwszym `npm install` Next.js sam dogeneruje `next-env.d.ts`.

## Supabase

1. Załóż projekt na supabase.com (region **Frankfurt** — najbliżej Polski, RODO-friendly).
2. SQL Editor → wykonaj `docs/database/01_schema.sql`.
3. SQL Editor → wykonaj `docs/database/02_rls_policies.sql`.
4. Settings → Database → Extensions → włącz `pgvector` i `btree_gist`.
5. Authentication → Providers → włącz Email (magic link), Google, Facebook, (Apple opcjonalnie).

## Struktura

- `src/app/` — App Router (groups: `(auth)`, `(resident)`, `(jokusor)`, `(admin)`, `api/`)
- `src/components/` — UI z podziałem na role
- `src/lib/` — supabase clients, auth guards, slot finder, tracking, AI, payments, types
- `src/hooks/` — React hooks (useUser, useOrder, useLiveTracking, useVoiceInput, useSlots)
- `src/stores/` — Zustand stores (orderDraft, voiceSession, tracking)
- `supabase/migrations/` — wersjonowane migracje SQL
- `supabase/functions/` — Edge Functions (Deno)
- `docs/` — kompletna specyfikacja produktu (architektura, moduły, schema, API, UI, legal, roadmap)

Pełne drzewo: zobacz `docs/` i odpowiadające im foldery w `src/`.

## Trzy kluczowe wymagania UX (nie kompromisować)

1. **3–4 kliknięcia** od ekranu głównego do potwierdzenia BLIK.
2. **Dwa równoległe wejścia**: kafelek graficzny LUB komenda głosowa do AI — obie kończą się na tym samym formularzu i tym samym endpointcie.
3. **Sloty nie mogą się nakładać** — `EXCLUDE USING gist` na poziomie PostgreSQL.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) · TanStack Query · Zustand · Zod · Mapbox · OpenAI (Whisper + embeddings + GPT-4o-mini) · Przelewy24 (BLIK).
