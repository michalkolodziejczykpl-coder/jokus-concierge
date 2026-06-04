-- ============================================================================
-- JOKUS Concierge — pre-Phase-1 fixes
-- ============================================================================
-- Naprawia 4 must-fix-y z REVIEW_REPORT.md (2026-05-23):
--   (1) brak triggera tworzącego public.users po auth signup → OAuth zostawiał
--       sierotę w auth.users, każdy is_admin()/is_jokusor()/current_role_id()
--       zwracał false dla nowo zalogowanych userów.
--   (2) dziurawa RLS na time_slots INSERT — każdy authenticated user mógł
--       wstawiać dowolne holdy (DoS rezerwacjami).
--   (3) bug w jokusor_serves_address — operator && (bbox overlap) zamiast
--       containment + niewłaściwy typ argumentu (geography vs geometry).
--   (4) order_events INSERT policy blokowała event 'created' wstawiany przez
--       mieszkańca w POST /api/orders (zanim zlecenie ma jokusora).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- (1) Trigger: auth.users -> public.users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, oauth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill dla userów, którzy zarejestrowali się przed dodaniem triggera
-- (np. konto Michała z testu OAuth na żywym Supabase).
INSERT INTO public.users (id, email, full_name, avatar_url, oauth_provider)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  au.raw_user_meta_data->>'avatar_url',
  au.raw_app_meta_data->>'provider'
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- ---------------------------------------------------------------------------
-- (2) Time slots — usuń policy pozwalającą każdemu wstawiać holdy
-- ---------------------------------------------------------------------------
-- Brak INSERT policy => żaden authenticated/anon user nie wstawi rekordu.
-- Service role omija RLS, więc Edge Function `slot-finder` (key z
-- SUPABASE_SERVICE_ROLE_KEY) wstawia normalnie.

DROP POLICY IF EXISTS "slots_insert_system" ON time_slots;

-- ---------------------------------------------------------------------------
-- (3) jokusor_serves_address — fallback po polygonie osiedla
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION jokusor_serves_address(
  p_jokusor_id uuid,
  p_point geography,
  p_postal_code text
) RETURNS boolean AS $$
DECLARE
  j RECORD;
  estate_boundary geography;
BEGIN
  SELECT * INTO j FROM jokusors WHERE user_id = p_jokusor_id AND is_active;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Polygon serwisowy jokusora ma priorytet.
  IF j.service_area IS NOT NULL THEN
    RETURN ST_Covers(j.service_area, p_point);
  END IF;

  -- Fallback: lista kodów pocztowych.
  IF j.service_postal_codes IS NOT NULL AND array_length(j.service_postal_codes, 1) > 0 THEN
    RETURN p_postal_code = ANY(j.service_postal_codes);
  END IF;

  -- Fallback: cały polygon osiedla.
  SELECT boundary INTO estate_boundary FROM estates WHERE id = j.estate_id;
  IF estate_boundary IS NULL THEN RETURN false; END IF;
  RETURN ST_Covers(estate_boundary, p_point);
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- (4) order_events — INSERT policy dla mieszkańca przy tworzeniu zlecenia
-- ---------------------------------------------------------------------------
-- Eventy 'paid', 'refunded' lecą z webhooka P24 service-rolem (omija RLS),
-- więc nie potrzebują własnej policy.

DROP POLICY IF EXISTS "events_insert_resident_create" ON order_events;
CREATE POLICY "events_insert_resident_create" ON order_events
  FOR INSERT WITH CHECK (
    event_type = 'created'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_events.order_id
        AND resident_id = auth.uid()
    )
  );
