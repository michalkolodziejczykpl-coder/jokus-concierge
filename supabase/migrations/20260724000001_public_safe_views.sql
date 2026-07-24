-- Public-safe read layer + column-scoped RLS narrowing.
--
-- INCIDENT (RODO): the read policies from 20260516000002 (16.05) granted
-- ROW access to whole tables, exposing ALL COLUMNS to any reader — including
-- anonymous. Confirmed 24.07 on production: anyone (no login) could read via
-- PostgREST:
--   * jokusors.* — nip, regon, bank_account, background_check_url (scan of a
--     criminal-record certificate path), insurance_*, service_postal_codes,
--     payout_share, commission_rate …
--   * users.* for every jokusor — email, phone, oauth_provider, preferences.
--   * marketplace_listings.pickup_address — the seller's exact home address,
--     shown to any same-estate resident before buying; the policy also lacked
--     a moderation_status filter (a pending/rejected listing with
--     status='active' would be publicly visible).
-- Resident-to-resident was already safe (users_read_own scoped correctly).
--
-- FIX (owner-approved 24.07): RLS cannot restrict COLUMNS, so public reads now
-- go through two SECURITY DEFINER views exposing only safe columns, and the
-- base-table public policies are dropped. Owner/admin/active-order reads keep
-- working via the remaining policies; slot-finding and purchase run through
-- SECURITY DEFINER functions that bypass RLS, so the buy path is untouched.
--
-- pickup_address is revealed to the BUYER only after they create an order
-- (create_marketplace_purchase copies it onto the order; orders RLS covers it).
--
-- NOT applied automatically. Owner applies via the Supabase SQL Editor, then
-- regenerates src/lib/types/database.ts. A ready ROLLBACK block is at the end.

BEGIN;

-- ===========================================================================
-- (A) public_jokusor_profiles — name, avatar, photo, rating, rough area only
-- ===========================================================================
DROP VIEW IF EXISTS public.public_jokusor_profiles;
CREATE VIEW public.public_jokusor_profiles AS
  SELECT
    jk.user_id,
    u.full_name,
    u.avatar_url,
    jk.public_photo_url,
    jk.rating,
    jk.completed_jobs_count,
    jk.estate_id,
    e.name AS estate_name
  FROM public.jokusors jk
  JOIN public.users u ON u.id = jk.user_id
  LEFT JOIN public.estates e ON e.id = jk.estate_id
  WHERE jk.is_active
    AND u.deleted_at IS NULL;

GRANT SELECT ON public.public_jokusor_profiles TO anon, authenticated;

-- ===========================================================================
-- (B) public_listings — every listing column EXCEPT pickup_address /
--     moderation_notes, and only genuinely public (active + approved) rows
-- ===========================================================================
DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings AS
  SELECT
    id, seller_id, estate_id, title, description, category, price, currency,
    condition, status, photos, delivery_option, moderation_status,
    views_count, expires_at, created_at, updated_at
  FROM public.marketplace_listings
  WHERE status = 'active'
    AND moderation_status IN ('auto_approved', 'manual_approved');

GRANT SELECT ON public.public_listings TO anon, authenticated;

-- ===========================================================================
-- (C) Narrow the base-table public read policies
-- ===========================================================================
-- users: drop the "every jokusor's full row is public" policy. Own row,
-- admin, and resident-during-active-order reads remain.
DROP POLICY IF EXISTS "users_read_public_profile" ON public.users;

-- jokusors: drop the "any active jokusor's full row is public" policy. Own,
-- admin remain; public identity now comes from public_jokusor_profiles.
DROP POLICY IF EXISTS "jokusors_read_active" ON public.jokusors;

-- marketplace_listings: base table read is now seller/admin only (so
-- pickup_address never leaves via the base table). Public browsing uses
-- public_listings; the buyer gets pickup_address via their order.
DROP POLICY IF EXISTS "listings_read_active" ON public.marketplace_listings;
CREATE POLICY "listings_read_owner_admin" ON public.marketplace_listings
  FOR SELECT USING (seller_id = auth.uid() OR is_admin());

COMMIT;

-- ===========================================================================
-- VERIFICATION — send the result back. Part 1 replays today's ANONYMOUS
-- tests under the anon role (RLS applies); part 2 checks the view shape.
-- ===========================================================================

-- Part 1: as anon (RLS active) — base tables must now be closed, views open.
BEGIN;
SET LOCAL ROLE anon;
SELECT * FROM (VALUES
  ('anon: jokusors bezpośrednio (ma być 0)',
     (SELECT count(*) FROM public.jokusors)::text, '0'),
  ('anon: users role=jokusor bezpośrednio (ma być 0)',
     (SELECT count(*) FROM public.users WHERE role = 'jokusor')::text, '0'),
  ('anon: marketplace_listings bezpośrednio (ma być 0)',
     (SELECT count(*) FROM public.marketplace_listings)::text, '0'),
  ('anon: public_jokusor_profiles (ma być >=1)',
     (SELECT count(*) FROM public.public_jokusor_profiles)::text, '>=1'),
  ('anon: public_listings = tylko approved+active',
     (SELECT count(*) FROM public.public_listings)::text,
     (SELECT count(*)::text FROM public.marketplace_listings
        WHERE status='active' AND moderation_status IN ('auto_approved','manual_approved')))
) AS t(check_name, actual, expected);
ROLLBACK;

-- Part 2: views expose no sensitive columns (run as the migration role).
SELECT * FROM (VALUES
  ('public_jokusor_profiles: brak email/phone/nip/bank/docs',
     (SELECT count(*)::text FROM information_schema.columns
        WHERE table_name='public_jokusor_profiles'
          AND column_name IN ('email','phone','nip','regon','bank_account',
                              'background_check_url','payout_share',
                              'service_postal_codes','service_area')),
     '0'),
  ('public_listings: brak pickup_address / moderation_notes',
     (SELECT count(*)::text FROM information_schema.columns
        WHERE table_name='public_listings'
          AND column_name IN ('pickup_address','moderation_notes')),
     '0'),
  ('polityki publicznego odczytu usunięte (ma być 0)',
     (SELECT count(*)::text FROM pg_policies
        WHERE policyname IN ('users_read_public_profile','jokusors_read_active','listings_read_active')),
     '0')
) AS t(check_name, actual, expected);

-- ===========================================================================
-- ROLLBACK — jeśli coś się wysypie, wklej PONIŻSZY blok OSOBNO (jedna operacja).
-- Odtwarza 3 polityki z 20260516000002 i usuwa widoki.
-- ===========================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS public.public_jokusor_profiles;
-- DROP VIEW IF EXISTS public.public_listings;
-- DROP POLICY IF EXISTS "listings_read_owner_admin" ON public.marketplace_listings;
-- CREATE POLICY "users_read_public_profile" ON public.users
--   FOR SELECT USING (role = 'jokusor' AND deleted_at IS NULL);
-- CREATE POLICY "jokusors_read_active" ON public.jokusors
--   FOR SELECT USING (is_active);
-- CREATE POLICY "listings_read_active" ON public.marketplace_listings
--   FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR is_admin());
-- COMMIT;
