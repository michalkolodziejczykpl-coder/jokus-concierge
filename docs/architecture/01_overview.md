# Architektura — przegląd wysokiego poziomu

## Diagram warstw

```
┌─────────────────────────────────────────────────────────────┐
│                     KLIENCI (PWA → RN)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Mieszkaniec │  │   Jokusor    │  │    Admin     │        │
│  │  (web/mobile)│  │ (web/mobile) │  │   (web only) │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS 14 (App Router)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Server Components + Server Actions + API Routes    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Middleware: auth check, role-based routing         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE (managed PG)                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ PostgreSQL │ │    Auth    │ │  Realtime  │ │ Storage  │  │
│  │ +pgvector  │ │  (OAuth)   │ │ (channels) │ │ (files)  │  │
│  │ +btree_gist│ │            │ │            │ │          │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Edge Functions: AI intent, slot finder, webhooks   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    USŁUGI ZEWNĘTRZNE                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │Przelewy24│ │  Mapbox  │ │ OpenAI   │ │  Web Push API  │  │
│  │  (BLIK)  │ │  (mapy)  │ │(Whisper) │ │ (FCM + Apple)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Kluczowe decyzje architektoniczne

### 1. Monolit Next.js zamiast mikroserwisów (na start)

Na etapie MVP (do ~5000 użytkowników) cała logika żyje w jednym repo Next.js. Powody:
- Jeden deploy = jedna prawda o stanie kodu
- Niski koszt utrzymania (Vercel + Supabase = <500 zł/mies)
- Łatwiej iterować, gdy budujesz sam
- Refactoring do mikroserwisów później jest możliwy

Wyjątek: AI intent recognition jako Edge Function w Supabase (niższe latencje + bliżej bazy z embeddingami).

### 2. Server Components + Server Actions wszędzie gdzie się da

Dane wrażliwe (saldo, dane jokusora, statystyki admina) NIGDY nie idą do klienta jako JSON. Renderujemy je w Server Components. Mutacje przez Server Actions (z walidacją zod).

API Routes używamy tylko dla:
- Webhooki (Przelewy24)
- Endpointy wywoływane przez aplikacje natywne RN (etap 2)
- SSE/streaming (live tracking)

### 3. Realtime przez Supabase Channels

Trzy główne kanały:
- `tracking:order:{id}` — pozycja jokusora w drodze
- `chat:order:{id}` — wiadomości
- `notifications:user:{id}` — push w aplikacji

Każdy kanał ma RLS-policy ograniczającą subscribers (tylko mieszkaniec danego zamówienia + jokusor + admin).

### 4. Sloty czasowe jako prawda w bazie

Constraint `EXCLUDE USING gist` w PostgreSQL gwarantuje brak nakładania się slotów tego samego jokusora. Aplikacja może mieć bug — baza nie pozwoli zapisać konfliktu.

```sql
EXCLUDE USING gist (
  jokusor_id WITH =,
  range WITH &&
)
```

To race-condition-safe nawet przy 1000 równoczesnych zamówieniach.

### 5. AI głosowe = wypełniacz formularza, nie chatbot

AI NIE generuje odpowiedzi swobodnie. Jest klasyfikatorem intencji + ekstraktorem parametrów. Wynik: ten sam formularz co przy kliknięciu kafelka, ale z polami pre-wypełnionymi z transkrypcji głosu.

Skończona pula odpowiedzi = vector similarity w pgvector. Próg 0.75; poniżej → fallback "Nie rozumiem, mogę pomóc z: [3 najpopularniejsze intencje]".

## Stack technologiczny — pełna lista

| Warstwa | Technologia | Wersja | Dlaczego |
|---------|-------------|--------|----------|
| Framework | Next.js | 14 (App Router) | SSR/SSG, Server Actions, route groups |
| Język | TypeScript | 5.x | Bezpieczeństwo typów, lepsze IDE |
| Styl | Tailwind CSS | 3.x | Szybkie prototypowanie, mobile-first |
| Baza | PostgreSQL (Supabase) | 15+ | RLS, GIST, pgvector, btree_gist |
| Auth | Supabase Auth | – | OAuth providers out-of-the-box |
| Realtime | Supabase Realtime | – | WebSocket + PostgreSQL changes |
| Storage | Supabase Storage | – | Zdjęcia ogłoszeń, awatary, faktury |
| State | Zustand | 4.x | Prosta state machine dla drafta zamówienia |
| Data fetching | TanStack Query | 5.x | Cache + invalidacja, optimistic updates |
| Walidacja | Zod | 3.x | Współdzielone schemy frontend/backend |
| Daty | date-fns | 3.x | Polski locale, mniejszy bundle niż moment |
| Ikony | Lucide React | – | Spójny styl, tree-shaking |
| Mapy | Mapbox GL JS | 3.x | Tańsze niż Google Maps przy skali |
| Płatności | Przelewy24 | – | BLIK + karty, polski operator |
| AI | OpenAI API | – | Whisper (PL) + text-embedding-3-small |
| Push | Web Push (FCM) | – | Darmowe dla użytkownika |
| Hosting | Vercel | – | Edge functions, preview deployments |
| Monitoring | Sentry | – | Error tracking |
| Analytics | PostHog (self-hosted) | – | RODO-friendly, własne dane |

## Etap 2 — przejście na natywne aplikacje

Gdy PWA osiągnie ~3000 DAU:
- React Native + Expo (jeden kod = Android + iOS)
- Współdzielone z Next.js: API endpointy, typy z `lib/types/`, validatory zod
- Różne tylko: warstwa UI (RN komponenty zamiast HTML)

Backend (Supabase + Edge Functions) nie zmienia się wcale.
