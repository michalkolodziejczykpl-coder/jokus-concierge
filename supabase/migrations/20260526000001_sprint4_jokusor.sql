-- Sprint 4: jokusor side of the order lifecycle.
-- Two parts:
--   (A) RLS extensions so jokusor can read resident name + address from the
--       moment the order hits 'pending' (was 'accepted' before — but jokusor
--       needs name + address to decide whether to accept).
--   (B) Four SECURITY DEFINER functions covering the lifecycle:
--       - mock_pay_order        (resident: hold → pending, time_slot → confirmed)
--       - jokusor_accept_order  (jokusor: pending → accepted)
--       - jokusor_start_order   (jokusor: accepted → in_progress)
--       - jokusor_complete_order(jokusor: in_progress → completed)
--
-- mock_pay_order is a stand-in for the Przelewy24 webhook — sprint 3c will
-- replace it with real signature-verified status updates.

-- ===========================================================================
-- (A.1) Users: jokusor reads resident profile on active order
-- ===========================================================================

DROP POLICY IF EXISTS "users_read_resident_on_active_order" ON public.users;
CREATE POLICY "users_read_resident_on_active_order" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE resident_id = users.id
        AND jokusor_id = auth.uid()
        AND status IN ('pending','accepted','in_transit','at_pickup','in_progress','in_return')
    )
  );

-- ===========================================================================
-- (A.2) Addresses: extend jokusor visibility to 'pending'
-- ===========================================================================

DROP POLICY IF EXISTS "addresses_jokusor_read_active" ON public.addresses;
CREATE POLICY "addresses_jokusor_read_active" ON public.addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE address_id = addresses.id
        AND jokusor_id = auth.uid()
        AND status IN ('pending','accepted','in_transit','at_pickup','in_progress','in_return')
    )
  );

-- ===========================================================================
-- (B.1) mock_pay_order — stand-in for the P24 success webhook
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.mock_pay_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order RECORD;
  v_time_slot RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, resident_id, status, jokusor_id
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.resident_id <> v_user_id THEN
    RAISE EXCEPTION 'order_not_owned' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.status <> 'hold' THEN
    RAISE EXCEPTION 'order_not_in_hold' USING ERRCODE = 'P0001';
  END IF;

  -- Find the active hold time_slot
  SELECT id, hold_expires_at
  INTO v_time_slot
  FROM time_slots
  WHERE order_id = p_order_id AND status = 'hold'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_hold' USING ERRCODE = 'P0001';
  END IF;
  IF v_time_slot.hold_expires_at < now() THEN
    RAISE EXCEPTION 'hold_expired' USING ERRCODE = 'P0001';
  END IF;

  -- Promote order
  UPDATE orders
  SET status = 'pending'
  WHERE id = p_order_id;

  -- Confirm slot
  UPDATE time_slots
  SET status = 'confirmed'
  WHERE id = v_time_slot.id;

  -- Log event
  INSERT INTO order_events (order_id, event_type, metadata)
  VALUES (
    p_order_id,
    'paid',
    jsonb_build_object('via', 'mock_pay', 'sprint', '4-temp')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_pay_order(uuid) TO authenticated;

-- ===========================================================================
-- (B.2) jokusor_accept_order — pending → accepted
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.jokusor_accept_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, jokusor_id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.jokusor_id <> v_user_id THEN
    RAISE EXCEPTION 'not_assigned_jokusor' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'order_not_pending' USING ERRCODE = 'P0001';
  END IF;

  UPDATE orders
  SET status      = 'accepted',
      accepted_at = now()
  WHERE id = p_order_id;

  INSERT INTO order_events (order_id, event_type)
  VALUES (p_order_id, 'accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.jokusor_accept_order(uuid) TO authenticated;

-- ===========================================================================
-- (B.3) jokusor_start_order — accepted → in_progress
-- ===========================================================================
-- Skips intermediate in_transit/at_pickup for sprint 4 simplicity. Tracking
-- module (sprint 5+) will add proper checkpoint transitions.

CREATE OR REPLACE FUNCTION public.jokusor_start_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, jokusor_id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.jokusor_id <> v_user_id THEN
    RAISE EXCEPTION 'not_assigned_jokusor' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.status <> 'accepted' THEN
    RAISE EXCEPTION 'order_not_accepted' USING ERRCODE = 'P0001';
  END IF;

  UPDATE orders
  SET status     = 'in_progress',
      started_at = now()
  WHERE id = p_order_id;

  UPDATE time_slots
  SET status = 'in_progress'
  WHERE order_id = p_order_id AND status = 'confirmed';

  INSERT INTO order_events (order_id, event_type)
  VALUES (p_order_id, 'started');
END;
$$;

GRANT EXECUTE ON FUNCTION public.jokusor_start_order(uuid) TO authenticated;

-- ===========================================================================
-- (B.4) jokusor_complete_order — in_progress → completed
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.jokusor_complete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, jokusor_id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.jokusor_id <> v_user_id THEN
    RAISE EXCEPTION 'not_assigned_jokusor' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.status <> 'in_progress' THEN
    RAISE EXCEPTION 'order_not_in_progress' USING ERRCODE = 'P0001';
  END IF;

  UPDATE orders
  SET status       = 'completed',
      completed_at = now()
  WHERE id = p_order_id;

  UPDATE time_slots
  SET status = 'completed'
  WHERE order_id = p_order_id AND status = 'in_progress';

  -- Increment jokusor stats
  UPDATE jokusors
  SET completed_jobs_count = completed_jobs_count + 1
  WHERE user_id = v_user_id;

  INSERT INTO order_events (order_id, event_type)
  VALUES (p_order_id, 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.jokusor_complete_order(uuid) TO authenticated;
