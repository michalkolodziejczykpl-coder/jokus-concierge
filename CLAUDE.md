# CLAUDE.md — Project memory for Claude Code

This file is automatically loaded by Claude Code on session start. It tells the agent how to operate in this repository.

## Project at a glance

**JOKUS Concierge** — franchise platform for neighbourhood services (errands, deliveries, dog walking, "watch the plumber"). JOKUS Sp. z o.o., Wrocław, NIP 9131639730. Estoński CIT.

- **Stage 1 (current):** PWA — Next.js 16 (App Router) + Supabase (Postgres + Auth + Realtime + Storage + Edge Functions).
- **Stage 2 (after ~3000 DAU):** React Native (Expo) sharing the same backend.
- **Language:** Polish in UI strings, English in code, comments, commit messages, PR descriptions.
- **Author:** Michał Kołodziejczyk (sole maintainer, working solo).

## Repository state

Phase 1 largely implemented. As of July 2026 (47 commits on `main`):

- ✅ Config in place; `package.json` on Next 16.2.x / React 19 (bumped from 14 to clear 14.x CVEs). **Note:** the package `name` field is still `migmig-concierge` — renaming it to `jokus-concierge` is a separate, deliberate task.
- ✅ Supabase migrations: **26 versioned files** in `supabase/migrations/` (initial schema, RLS, phase-1 fixes, slot finder/hold, sprint-4 order lifecycle, marketplace, grocery catalog, jokusor onboarding, seeds…), applied to the live dev project. RLS is enabled on all tables.
- ✅ Auth is real, not stubs: Supabase clients (browser/server/admin/middleware); Google OAuth + email/password + magic-link + phone-OTP (SMSAPI) all working. Session refresh via `proxy.ts`. `(auth)/callback` validates its `next` param (no open redirect).
- ✅ Resident home (`(resident)/home/page.tsx`) is the real tile grid over the module catalog (no longer a placeholder).
- ✅ Public `/privacy`, `/data-deletion`, `/regulamin`, `/cookies` pages (Polish, RODO-minimal — placeholder legal text, must be lawyer-reviewed before public launch).
- ✅ `npm run dev`, `npm run build`, `npm run typecheck` all green.
- ✅ Deployed to Vercel (production https://www.jokus.pl, auto-deploys from `main`; internal URL https://migmig-concierge.vercel.app is a fallback). Vercel "Standard Protection" disabled on Production so public pages + crawlers can reach them. OAuth Google verified on localhost + prod; Facebook paused pending Meta Business Verification; Apple deferred to Stage 2 native.
- ✅ **Business logic is implemented (Phase 1, mostly):**
  - Full order lifecycle: `draft → hold → pending → accepted → in_progress → completed` (+ `cancelled`/`disputed`), driven by SECURITY DEFINER SQL functions.
  - Slot picker with a 90-second hold; overlap prevented at the DB via `EXCLUDE USING gist`.
  - Grocery shop (`/sklep`) with cart / favorites / checkout — checkout **reuses the same order/slot/payment pipeline** (no divergent path).
  - Marketplace C2C: listings, buy (creates a draft delivery order + purchase row), messaging, reports.
  - In-app order chat, ratings + tips, live GPS tracking (Realtime **broadcast-only**, nothing persisted).
  - Three role panels: resident / jokusor (dashboard + order actions + tracking share) / admin (modules, estates + per-estate activations, products, product-categories, jokusor review, users).
- ⚠️ **Payments are mocked.** `mock_pay_order` SQL fn + `/api/payments/mock-pay`, gated by `MOCK_PAYMENT_ALLOWLIST` (fail-closed in production). The Przelewy24 webhook is still a TODO stub — no real money moves yet.
- ❌ **Not built yet:** voice ordering + AI intent, jokusor earnings/settlement + invoicing, marketplace escrow release (15-min inspection / 5% commission), per-estate module filtering on the resident side (the `module_activations` admin UI exists but the resident home shows all `is_global` modules — see `hooks/useModules.ts`). Edge Functions `slot-finder` / `tracking-broadcast` / `ai-intent-recognition` / `przelewy24-webhook` are stubs; only `send-sms` is real.
- ❌ No tests. Deferred per roadmap Faza 6; note the "premature scaffold" rationale is weakening now that a real order/slot/payment state machine exists.

The full design spec lives in `docs/` — 15 markdown files + 2 SQL files. The reference contract is `JOKUS_Concierge_koncepcja_v2.docx` (not in repo; lives on Michał's machine).

## Live infrastructure

These are the actual deployed resources — use them when configuring env vars, OAuth allow-lists, or debugging production:

- **Production URL**: https://www.jokus.pl (canonical; apex `jokus.pl` 307-redirects to www). Vercel internal URL https://migmig-concierge.vercel.app still resolves as fallback.
- **Supabase project**: https://uveeqjidyuumcddnfnop.supabase.co (region Stockholm, EU-North-1)
- **GitHub**: https://github.com/michalkolodziejczykpl-coder/migmig-concierge (private)
- **Vercel team / project**: `migmig-s-projects` / `migmig-concierge` (Hobby plan)
- **Google Cloud OAuth project**: `JOKUS Concierge` (project number 862680181705), Web Client `JOKUS Web Client`. App is in Testing mode — Google shows the "unverified app" warning until verified.
- **Supabase Auth → Redirect URLs allow-list**: localhost:3000/**, www.jokus.pl/**, jokus.pl/**, \_.jokus.pl/**, migmig-concierge.vercel.app/\*\*, \_-migmig-s-projects.vercel.app/\*\* (preview deploys).
- **Custom domain `jokus.pl`**: registered at cyber_Folks, DNS managed there. Apex A record → `216.198.79.1` (Vercel); `www` CNAME → `649dbf5c4524d786.vercel-dns-017.com`. SSL auto-provisioned by Vercel (Let's Encrypt).

## Three non-negotiable UX requirements

These come from the product spec and override convenience trade-offs:

1. **3–4 clicks from home screen to BLIK confirmation** for a logged-in resident.
2. **Two parallel entry points** to ordering: tile grid OR voice command — both must hit the _same_ form and the _same_ API endpoint. No divergent paths.
3. **Time slots cannot overlap.** Enforced at the PostgreSQL level via `EXCLUDE USING gist`, not just in application code. Application bugs must not be able to cause double bookings.

## File layout

```
src/
├── app/                       Next.js App Router
│   ├── (auth)/                Public auth screens — login, register, reset, OAuth + email callback
│   ├── (resident)/            Resident panel — home (tile grid), modules/[slug], orders (+slots), marketplace, sklep, profile
│   ├── (jokusor)/             Franchisee panel — dashboard + order actions + live-tracking share
│   ├── (admin)/               Admin panel (Michał only) — modules, estates (+activations), products, product-categories, jokusors, users
│   └── api/                   Route handlers — orders, slots, payments, marketplace, sklep, admin, jokusor, register, profile
├── components/                Role-segregated UI (resident/, jokusor/, admin/, marketplace/, shared/). NOTE: ui/ exists but is EMPTY — primitives are inlined per component for now.
├── lib/
│   ├── supabase/              client.ts (browser), server.ts (SSR), admin.ts (service role), middleware.ts
│   ├── auth/                  guards.ts (requireAdmin), getDefaultAddress.ts
│   ├── slots/                 EMPTY — slot logic lives in SQL SECURITY DEFINER fns (get_available_slots, create_slot_hold, cancel_slot_hold)
│   ├── tracking/              geo.ts (haversine, ETA). Live position is Realtime broadcast, never stored.
│   ├── ai/                    EMPTY — voice / intent deferred (Phase 3)
│   ├── payments/              mockGate.ts (mock-payment allowlist gate). Real Przelewy24 integration NOT written yet.
│   ├── maps/                  EMPTY — no geocoding / distance client yet
│   ├── types/                 database.ts (GENERATED by `supabase gen types`, UTF-8) + hand-written domain types (modules, orders, marketplace, addresses, estates) that REFINE the generated rows
│   ├── utils/                 cn, formatters (PLN, PL dates), validators (zod)
│   └── constants.ts
├── hooks/                     useModules, useEstates, useDefaultAddress (TanStack Query, client-side reads only)
├── stores/                    EMPTY — Zustand is a dependency but UNUSED (no stores written; keep-or-drop decision pending)
└── proxy.ts                   Session refresh (renamed from `middleware.ts` in Next 16)
supabase/
├── migrations/                Versioned SQL — 26 files (schema, RLS, slot fns, order lifecycle, marketplace, grocery, onboarding, seeds)
└── functions/                 Deno Edge Functions — only send-sms is real; ai-intent-recognition, slot-finder, tracking-broadcast, przelewy24-webhook are stubs
docs/                           Full design spec (architecture, modules, database, api, ui, legal, roadmap)
```

URL groups in parens (`(resident)`, `(jokusor)`, `(admin)`) do **not** appear in the URL — they exist solely to share layouts and role guards.

## Conventions

- **React files:** `PascalCase.tsx`
- **Utility/lib files:** `camelCase.ts`
- **API routes:** `route.ts` (Next.js App Router convention)
- **SQL:** `snake_case` (tables, columns)
- **TypeScript types:** `PascalCase`
- **Import alias:** `@/*` → `src/*`
- **Comments and identifiers:** English. UI strings: Polish.
- **Tabs:** 2 spaces, single quotes, no trailing commas (`.prettierrc`).

## Tech stack — versions and constraints

- Next.js 16.2.x, React 19.x, TypeScript 5.5.x (strict mode on). Bumped from 14 to 16 during scaffold setup to clear 14 high-severity CVEs accumulated in 14.x line. Note: `cookies()`, `headers()`, `params`, `searchParams` are async in Next 15+.
- Tailwind 3.4.x (no UI library yet — `components/ui/` is the intended home for primitives but is currently EMPTY; primitives are inlined per component)
- Supabase JS 2.45.x + `@supabase/ssr` 0.5.x
- TanStack Query 5.51.x (used only for a few client-side reads — see `hooks/`), Zustand 4.5.x (**installed but UNUSED — `src/stores/` is empty; dead dependency pending a keep-or-drop decision**), Zod 3.23.x (validation)
- Edge Functions: Deno (std@0.224.0)
- Postgres 15 with extensions: `pgvector`, `btree_gist`, `postgis`, `uuid-ossp`
- Region: Stockholm (EU-North-1) — Supabase dev project. Spec recommended Frankfurt (~25ms) but Stockholm (~30-35ms from PL) is equally RODO-friendly and the difference is imperceptible in PWA. Recorded deviation from spec.

## What to do when asked to add a feature

1. **Read the spec first.** Almost every feature is already designed in `docs/`. Check `docs/modules/`, `docs/api/`, `docs/architecture/` before inventing patterns.
2. **Respect the role boundary.** Files in `(resident)` must not import from `(jokusor)` or `(admin)`. Shared logic goes in `lib/`. Shared components in `components/shared/`.
3. **Validate inputs with Zod**, both client-side (forms) and server-side (Route Handlers / Server Actions). Schemas live in `lib/utils/validators.ts` or per-module under `lib/types/`.
4. **Match the existing data pattern.** In practice most reads happen in **Server Components calling the Supabase server client directly** (RLS applies). TanStack Query is used only for a few client-side reads that benefit from caching (`hooks/useModules`, `useEstates`, `useDefaultAddress`). Reach for a TanStack Query hook when a Client Component needs cached/refetchable data; otherwise fetch server-side. Note: the query results are cast (`as X`) to hand-written domain types that refine the generated DB rows.
5. **For writes that touch slots, payments, or tracking**, prefer a Route Handler that uses the server client or the admin client. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
6. **Test the slot constraint at the DB layer**, not just by uniqueness checks in JS. The whole point of `EXCLUDE USING gist` is that the DB is the source of truth.

## Quality gates before declaring "done"

Before committing a substantive change, the agent should run:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint (once eslint is configured)
npm run build        # full Next.js build
npm run format       # prettier --write .
```

All four must pass. If `lint` is not yet configured (current state), skip it but note that in the PR.

## Things to avoid

- **Don't introduce a new state-management library.** Zustand is already a dependency (though currently UNUSED — `src/stores/` is empty) and TanStack Query covers client caching. Decide whether to actually use Zustand or drop it before reaching for anything else.
- **Don't add a UI kit (shadcn, MUI, Chakra) without discussion.** Tailwind primitives are the chosen path — minimum dependencies, max control. (`components/ui/` is the intended home for them but is currently empty; primitives are inlined per component.)
- **Don't store raw GPS positions.** Live position is broadcast-only via Supabase Realtime. Only checkpoint events (`accepted`, `started`, `arrived_pickup`, etc.) hit `order_events` table. RODO requirement.
- **Don't bypass RLS** by routing reads through the service role. RLS is the security model — service role is for webhooks and admin actions only.
- **Tests are still deferred** to roadmap Faza 6 (Polish & scaling). But the codebase is no longer a bare scaffold — a full order/slot/payment state machine now exists — so once real payments land, smoke tests on the order lifecycle and slot hold are worth reconsidering ahead of Faza 6.

## Memory of past decisions

| Decision                                                         | Reason                                                                                                                                            | Source                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| PWA before native apps                                           | One codebase, faster to market, install-prompt on Android is good enough until 3000 DAU                                                           | Koncepcja v2 sec. 13.5  |
| Region Stockholm (instead of spec's Frankfurt)                   | Project was provisioned in EU-North-1 by mistake; ~10ms latency difference is negligible, region is immutable post-creation, not worth recreating | Setup decision May 2026 |
| OAuth-first auth (no password fields)                            | Every required field cuts conversion ~20%                                                                                                         | Spec sec. 6             |
| Three modes of `service_area` (polygon / postal codes / streets) | Different jokusors have different mental models for "my area"                                                                                     | Spec sec. 8             |
| Escrow held by JOKUS, released after 15-min inspection           | Protects both buyer and seller; commission 5% on marketplace                                                                                      | Spec sec. 7.3           |
| Slots: 90-second hold before payment                             | Long enough to enter BLIK code, short enough to free up after abandon                                                                             | Spec sec. 5.1           |
| AI confidence threshold 0.75                                     | Empirically right balance; fallback shows 3 most common intents                                                                                   | Spec sec. 4.3           |

## Useful pointers

- Full spec document: see `docs/` (each subdir has README-equivalent topic files).
- Roadmap and sprint breakdown: `docs/roadmap/01_phases.md`.
- Database schema: `docs/database/01_schema.sql` (and identical copy in `supabase/migrations/`).
- RLS policies: `docs/database/02_rls_policies.sql`.
- Setup guide (manual steps for first-time deploy): `SETUP_GUIDE.md`.
- Review brief for outside eyes: `REVIEW_BRIEF.md`.
