-- Retire automated status management for the test-jokusor seed.
--
-- Background
--   20260524000003_seed_test_jokusor.sql promotes user
--   7cedf870-8747-49d0-bce4-68db4fbc4bec (Julia) to an active, approved jokusor
--   via `INSERT ... ON CONFLICT (user_id) DO UPDATE`, which re-forces
--   is_active = true and onboarding_status = 'approved' every time it runs.
--   Julia is now a real jokusor whose status must be managed by hand, so that
--   seed must no longer act as the source of truth for her status.
--
-- Why this migration is a NO-OP (it changes no data)
--   * Already-migrated databases (e.g. production): 20260524000003 is recorded
--     in supabase_migrations.schema_migrations and is NEVER re-run by
--     `supabase db push`. Julia's status there is already whatever you set it to;
--     no future push overwrites it.
--   * From-scratch replay (`supabase db reset` / a brand-new project):
--     20260524000003 self-guards and RETURNs early unless a public.users row for
--     Julia already exists. No migration creates auth/users rows, so on a fresh
--     rebuild the seed no-ops on its own.
--
--   This file therefore does NOT touch public.users or public.jokusors: Julia's
--   row is left exactly as-is and her status is from now on yours to manage
--   manually. It exists as a dated tombstone at the end of the chain so the
--   decision is explicit and the automated seed is not reintroduced.
--
-- Do NOT edit 20260524000003 (already applied; migrations are immutable by
-- convention). The one residual case a later migration cannot close without
-- mutating Julia's live data — restoring her account and THEN replaying every
-- migration from scratch — must be handled operationally (exclude or rewrite the
-- seed when standing up that environment), never by changing her data here.

DO $$
BEGIN
  RAISE NOTICE 'Test-jokusor seed (20260524000003) retired: Julia''s status is now managed manually; no data changed by this migration.';
END $$;
