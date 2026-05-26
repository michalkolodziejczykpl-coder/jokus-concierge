-- Sprint 3b: slot-hold transactional functions + slot-finder expiry fix.
--
-- (1) Patch get_available_slots: treat expired holds as non-blocking.
-- (2) create_slot_hold: insert time_slot (hold 90s), update order to 'hold',
--     log event 'created'. All-or-nothing transaction. Race-safe via the
--     EXCLUDE USING gist constraint on time_slots.
-- (3) cancel_slot_hold: rollback to draft. Used both by user 'cancel' click
--     and by countdown hitting zero on the client.

-- ===========================================================================
-- (1) get_available_slots — filter expired holds
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_address_id uuid,
  p_module_slug text,
  p_from timestamptz DEFAULT now(),
  p_to timestamptz DEFAULT now() + interval '7 days'
)
RETURNS TABLE (
  jokusor_id uuid,
  jokusor_name text,
  slot_start timestamptz,
  slot_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id uuid;
  v_duration_min int;
  v_addr_point geography;
  v_addr_postal text;
  j RECORD;
  v_day date;
  v_dow int;
  v_day_hours jsonb;
  v_from_time time;
  v_to_time time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_now timestamptz := now();
  v_from_date date;
  v_to_date date;
BEGIN
  SELECT id, estimated_duration_min INTO v_module_id, v_duration_min
  FROM modules WHERE slug = p_module_slug;
  IF v_module_id IS NULL THEN RETURN; END IF;

  SELECT point, postal_code INTO v_addr_point, v_addr_postal
  FROM addresses WHERE id = p_address_id;
  IF v_addr_postal IS NULL THEN RETURN; END IF;

  v_from_date := (p_from AT TIME ZONE 'Europe/Warsaw')::date;
  v_to_date   := (p_to   AT TIME ZONE 'Europe/Warsaw')::date;

  FOR j IN
    SELECT jk.user_id, u.full_name, jk.working_hours, jk.vacation_until
    FROM jokusors jk
    JOIN users u ON u.id = jk.user_id
    WHERE jk.is_active
      AND (jk.vacation_until IS NULL OR jk.vacation_until < v_now::date)
      AND jokusor_serves_address(jk.user_id, v_addr_point, v_addr_postal)
  LOOP
    FOR v_day IN
      SELECT v_from_date + i FROM generate_series(0, v_to_date - v_from_date) i
    LOOP
      v_dow := EXTRACT(DOW FROM v_day)::int;
      v_day_hours := j.working_hours -> v_dow::text;
      IF v_day_hours IS NULL OR v_day_hours = 'null'::jsonb THEN CONTINUE; END IF;

      v_from_time := (v_day_hours ->> 'from')::time;
      v_to_time   := (v_day_hours ->> 'to')::time;
      v_slot_start := (v_day::text || ' ' || v_from_time::text)::timestamp
                        AT TIME ZONE 'Europe/Warsaw';

      WHILE v_slot_start + make_interval(mins => v_duration_min) <=
            (v_day::text || ' ' || v_to_time::text)::timestamp AT TIME ZONE 'Europe/Warsaw'
      LOOP
        v_slot_end := v_slot_start + make_interval(mins => v_duration_min);
        IF v_slot_start >= p_from AND v_slot_end <= p_to AND v_slot_start > v_now THEN
          -- Block only if a still-active booking overlaps. Expired holds
          -- (status='hold' AND hold_expires_at < now()) are treated as free.
          IF NOT EXISTS (
            SELECT 1 FROM time_slots ts
            WHERE ts.jokusor_id = j.user_id
              AND ts.status IN ('hold', 'confirmed', 'in_progress')
              AND (ts.status <> 'hold' OR ts.hold_expires_at > v_now)
              AND ts.range && tstzrange(v_slot_start, v_slot_end, '[)')
          ) THEN
            jokusor_id   := j.user_id;
            jokusor_name := j.full_name;
            slot_start   := v_slot_start;
            slot_end     := v_slot_end;
            RETURN NEXT;
          END IF;
        END IF;
        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN;
END;
$$;

-- ===========================================================================
-- (2) create_slot_hold — atomically reserve a slot for a draft order
-- ===========================================================================
-- Returns the new time_slot.id and hold_expires_at on success.
-- Raises:
--   P0001 'order_not_found'   - bad order id or RLS-blocked
--   P0001 'order_not_owned'   - belongs to a different resident
--   P0001 'order_not_draft'   - already paid / completed / etc.
--   P0001 'jokusor_inactive'  - target jokusor not active
--   23P01 (exclusion_violation) - slot already taken (catch in app code)

CREATE OR REPLACE FUNCTION public.create_slot_hold(
  p_order_id uuid,
  p_jokusor_id uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
RETURNS TABLE (
  time_slot_id uuid,
  hold_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_user_id uuid := auth.uid();
  v_new_slot_id uuid;
  v_expires_at timestamptz := now() + interval '90 seconds';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Lock the order row for the duration of this transaction
  SELECT id, resident_id, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.resident_id <> v_user_id THEN
    RAISE EXCEPTION 'order_not_owned' USING ERRCODE = 'P0001';
  END IF;
  IF v_order.status <> 'draft' THEN
    RAISE EXCEPTION 'order_not_draft' USING ERRCODE = 'P0001';
  END IF;

  -- Verify jokusor is active (cheap sanity check; the EXCLUDE constraint
  -- enforces overlap correctness regardless)
  IF NOT EXISTS (
    SELECT 1 FROM jokusors WHERE user_id = p_jokusor_id AND is_active
  ) THEN
    RAISE EXCEPTION 'jokusor_inactive' USING ERRCODE = 'P0001';
  END IF;

  -- INSERT time_slot. EXCLUDE constraint will raise 23P01 if a still-active
  -- overlapping slot exists for the same jokusor — caller must translate that
  -- to a 409 "slot taken, refresh".
  INSERT INTO time_slots (jokusor_id, order_id, range, status, hold_expires_at)
  VALUES (
    p_jokusor_id,
    p_order_id,
    tstzrange(p_slot_start, p_slot_end, '[)'),
    'hold',
    v_expires_at
  )
  RETURNING id INTO v_new_slot_id;

  -- Promote order to 'hold' and pin the jokusor + scheduled time
  UPDATE orders
  SET status        = 'hold',
      jokusor_id    = p_jokusor_id,
      scheduled_at  = p_slot_start
  WHERE id = p_order_id;

  -- Log the order_events 'created' (RLS policy events_insert_resident_create
  -- normally requires auth context — we're SECURITY DEFINER, bypassing RLS)
  INSERT INTO order_events (order_id, event_type, metadata)
  VALUES (
    p_order_id,
    'created',
    jsonb_build_object(
      'time_slot_id', v_new_slot_id,
      'hold_expires_at', v_expires_at
    )
  );

  time_slot_id    := v_new_slot_id;
  hold_expires_at := v_expires_at;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_slot_hold(uuid, uuid, timestamptz, timestamptz) TO authenticated;

-- ===========================================================================
-- (3) cancel_slot_hold — rollback hold to draft
-- ===========================================================================
-- Idempotent: re-running on an already-cancelled slot is a no-op.

CREATE OR REPLACE FUNCTION public.cancel_slot_hold(p_time_slot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_slot RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT ts.id, ts.status, ts.order_id, o.resident_id, o.status AS order_status
  INTO v_slot
  FROM time_slots ts
  JOIN orders o ON o.id = ts.order_id
  WHERE ts.id = p_time_slot_id
  FOR UPDATE OF ts, o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_slot.resident_id <> v_user_id THEN
    RAISE EXCEPTION 'slot_not_owned' USING ERRCODE = 'P0001';
  END IF;

  -- Already cancelled? No-op (idempotent for client retries on countdown=0).
  IF v_slot.status = 'cancelled' THEN
    RETURN;
  END IF;

  -- Only 'hold' is rollback-able. Don't touch confirmed/in_progress.
  IF v_slot.status <> 'hold' THEN
    RAISE EXCEPTION 'slot_not_in_hold' USING ERRCODE = 'P0001';
  END IF;

  UPDATE time_slots
  SET status = 'cancelled'
  WHERE id = p_time_slot_id;

  -- Rollback the order if it's still in hold (i.e. user didn't pay yet)
  IF v_slot.order_status = 'hold' THEN
    UPDATE orders
    SET status       = 'draft',
        jokusor_id   = NULL,
        scheduled_at = NULL
    WHERE id = v_slot.order_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_slot_hold(uuid) TO authenticated;
