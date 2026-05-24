-- One-off seed of a test jokusor (Julia Kolodziejczyk, Fabryczna estate).
-- Idempotent: re-runnable, conditional on the user_id existing.
-- On a fresh DB without Julia's auth row, this no-ops.
--
-- Created as part of sprint 3a (data layer for slot picker).

DO $$
DECLARE
  v_julia_id constant uuid := '7cedf870-8747-49d0-bce4-68db4fbc4bec';
  v_fabryczna_id uuid;
BEGIN
  -- Skip if Julia's user row is not present (fresh DB / different env).
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_julia_id) THEN
    RAISE NOTICE 'Julia user not present, skipping test jokusor seed';
    RETURN;
  END IF;

  -- Look up Fabryczna estate id by name.
  SELECT id INTO v_fabryczna_id FROM public.estates WHERE name = 'Fabryczna';
  IF v_fabryczna_id IS NULL THEN
    RAISE NOTICE 'Fabryczna estate not present, skipping test jokusor seed';
    RETURN;
  END IF;

  -- Promote to jokusor role.
  UPDATE public.users
  SET role = 'jokusor'
  WHERE id = v_julia_id;

  -- Insert jokusor profile (or upsert if re-run).
  -- Note: leaving working_hours, billing_model, max_concurrent_orders at table defaults
  -- (Mon-Fri 8-20, Sat 9-15, Sun off; billing_model='hybrid'; max_concurrent_orders=1).
  INSERT INTO public.jokusors (
    user_id,
    estate_id,
    service_postal_codes,
    bio,
    is_active,
    onboarding_status,
    contract_signed_at
  ) VALUES (
    v_julia_id,
    v_fabryczna_id,
    ARRAY['51-100','52-300','54-066','54-067','54-129','54-130','54-203','54-426'],
    'Testowy jokusor obslugujacy osiedle Fabryczna (Wroclaw)',
    true,
    'approved',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    estate_id            = EXCLUDED.estate_id,
    service_postal_codes = EXCLUDED.service_postal_codes,
    bio                  = EXCLUDED.bio,
    is_active            = true,
    onboarding_status    = 'approved';

  RAISE NOTICE 'Seeded test jokusor for Julia (estate: Fabryczna)';
END $$;
