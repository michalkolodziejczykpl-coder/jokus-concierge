# CLAUDE.md — Project memory for Claude Code

This file is automatically loaded by Claude Code on session start. It tells the agent how to operate in this repository.

## Project at a glance

**MIGMIG Concierge** — franchise platform for neighbourhood services (errands, deliveries, dog walking, "watch the plumber"). JOKUS Sp. z o.o., Wrocław, NIP 9131639730. Estoński CIT.

- **Stage 1 (current):** PWA — Next.js 14 (App Router) + Supabase (Postgres + Auth + Realtime + Storage + Edge Functions).
- **Stage 2 (after ~3000 DAU):** React Native (Expo) sharing the same backend.
- **Language:** Polish in UI strings, English in code, comments, commit messages, PR descriptions.
- **Author:** Michał Kołodziejczyk (sole maintainer, working solo).

## Repository state

End-of-setup, pre-Phase-1. As of late May 2026:

- ✅ Directory tree per `PROJECT_TREE.md` complete (105 dirs, .gitkeep in empty folders).
- ✅ Config files in place; `package.json` bumped to Next 16.2.x / React 19 to clear 14.x CVEs.
- ✅ Supabase migrations `01_initial_schema.sql` and `02_rls_policies.sql` **applied to the live dev project**. `03_seed_modules.sql` is still a commented stub.
- ✅ Source stubs: Supabase clients (browser/server/admin/middleware), root layout, landing, `(auth)/login`, `(auth)/register`, `(auth)/callback`, `OAuthButtons`.
- ✅ Minimal post-login placeholder at `(resident)/home/page.tsx` — shows user email + sign-out form. Will be replaced by the real tile grid in Phase 1.
- ✅ Public `/privacy` and `/data-deletion` pages (Polish, RODO-minimal — placeholder text, must be lawyer-reviewed before public launch).
- ✅ `node_modules` installed locally. `npm run dev`, `npm run build`, `npm run typecheck` all green.
- ✅ Deployed to Vercel (production: https://migmig-concierge.vercel.app, auto-deploys from `main`). Vercel Authentication ("Standard Protection") explicitly disabled on Production so public pages and Facebook/Google crawlers can reach them.
- ✅ OAuth: **Google only**, end-to-end verified on localhost and prod. Facebook is paused pending Meta Business Verification (1–5 day review); Apple deferred to Stage 2 native.
- ❌ Business logic — none. No order flow, no slot picker, no payments, no tracking, no marketplace. Edge Functions still TODO-only stubs.
- ❌ No tests. Per roadmap Faza 6 — premature for solo scaffold.

The full design spec lives in `docs/` — 15 markdown files + 2 SQL files. The reference contract is `MIGMIG_Concierge_koncepcja_v2.docx` (not in repo; lives on Michał's machine).

## Live infrastructure

These are the actual deployed resources — use them when configuring env vars, OAuth allow-lists, or debugging production:

- **Production URL**: https://migmig-concierge.vercel.app (canonical, stable across deploys)
- **Supabase project**: https://uveeqjidyuumcddnfnop.supabase.co (region Stockholm, EU-North-1)
- **GitHub**: https://github.com/michalkolodziejczykpl-coder/migmig-concierge (private)
- **Vercel team / project**: `migmig-s-projects` / `migmig-concierge` (Hobby plan)
- **Google Cloud OAuth project**: `MIGMIG Concierge` (project number 862680181705), Web Client `MIGMIG Web Client`. App is in Testing mode — Google shows the "unverified app" warning until verified.
- **Supabase Auth → Redirect URLs allow-list**: localhost:3000/**, migmig-concierge.vercel.app/**, _-migmig-s-projects.vercel.app/\*\*, _.migmig.pl/\*\* (future custom domain).

## Three non-negotiable UX requirements

These come from the product spec and override convenience trade-offs:

1. **3–4 clicks from home screen to BLIK confirmation** for a logged-in resident.
2. **Two parallel entry points** to ordering: tile grid OR voice command — both must hit the _same_ form and the _same_ API endpoint. No divergent paths.
3. **Time slots cannot overlap.** Enforced at the PostgreSQL level via `EXCLUDE USING gist`, not just in application code. Application bugs must not be able to cause double bookings.

## File layout

```
src/
├── app/                       Next.js App Router
│   ├── (auth)/                Public auth screens — login, register, OAuth callback
│   ├── (resident)/            Resident panel — home, modules/[slug], orders, marketplace, profile
│   ├── (jokusor)/             Franchisee panel — dashboard, calendar, service-area, jobs, earnings
│   ├── (admin)/               Admin panel (Michał only) — modules, jokusors, estates, finance, disputes
│   └── api/                   Route handlers — orders, slots, tracking, ai, marketplace, webhooks
├── components/                Role-segregated UI (ui/, resident/, jokusor/, admin/, marketplace/, shared/)
├── lib/
│   ├── supabase/              client.ts (browser), server.ts (SSR), admin.ts (service role), middleware.ts
│   ├── auth/                  providers, guards
│   ├── slots/                 slot-finder, validator
│   ├── tracking/              broadcast (Realtime), eta (haversine, optional Mapbox)
│   ├── ai/                    whisper, intent, responses
│   ├── payments/              przelewy24
│   ├── maps/                  distance, geocoding
│   ├── types/                 database.ts (generated by `supabase gen types`), modules, orders, marketplace
│   ├── utils/                 cn, formatters (PLN, PL dates), validators (zod)
│   └── constants.ts
├── hooks/                     useUser, useOrder, useLiveTracking, useVoiceInput, useSlots
├── stores/                    Zustand — orderDraft, voiceSession, tracking
└── proxy.ts                   Session refresh (renamed from `middleware.ts` in Next 16)
supabase/
├── migrations/                Versioned SQL (3 files at scaffold time)
└── functions/                 Deno Edge Functions — ai-intent-recognition, slot-finder, tracking-broadcast, przelewy24-webhook
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
- Tailwind 3.4.x (no UI library yet — build primitives in `components/ui/`)
- Supabase JS 2.45.x + `@supabase/ssr` 0.5.x
- TanStack Query 5.51.x (data fetching), Zustand 4.5.x (client state), Zod 3.23.x (validation)
- Edge Functions: Deno (std@0.224.0)
- Postgres 15 with extensions: `pgvector`, `btree_gist`, `postgis`, `uuid-ossp`
- Region: Stockholm (EU-North-1) — Supabase dev project. Spec recommended Frankfurt (~25ms) but Stockholm (~30-35ms from PL) is equally RODO-friendly and the difference is imperceptible in PWA. Recorded deviation from spec.

## What to do when asked to add a feature

1. **Read the spec first.** Almost every feature is already designed in `docs/`. Check `docs/modules/`, `docs/api/`, `docs/architecture/` before inventing patterns.
2. **Respect the role boundary.** Files in `(resident)` must not import from `(jokusor)` or `(admin)`. Shared logic goes in `lib/`. Shared components in `components/shared/`.
3. **Validate inputs with Zod**, both client-side (forms) and server-side (Route Handlers / Server Actions). Schemas live in `lib/utils/validators.ts` or per-module under `lib/types/`.
4. **Wrap data fetching in TanStack Query hooks** (`hooks/`). Don't call Supabase directly from a component if it would result in duplicated fetch logic.
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

- **Don't introduce a new state-management library.** Zustand + TanStack Query covers everything we need.
- **Don't add a UI kit (shadcn, MUI, Chakra) without discussion.** Tailwind primitives in `components/ui/` are the chosen path — minimum dependencies, max control.
- **Don't store raw GPS positions.** Live position is broadcast-only via Supabase Realtime. Only checkpoint events (`accepted`, `started`, `arrived_pickup`, etc.) hit `order_events` table. RODO requirement.
- **Don't bypass RLS** by routing reads through the service role. RLS is the security model — service role is for webhooks and admin actions only.
- **Don't add tests yet.** Roadmap Faza 6 (Polish & scaling). Premature for a one-person scaffold.

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
