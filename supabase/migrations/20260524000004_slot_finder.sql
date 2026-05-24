-- Sprint 3a: slot-finder logic in Postgres (Edge Function deferred — see REVIEW_REPORT #15).
--
-- get_available_slots(address_id, module_slug, from, to) returns rows of
-- (jokusor_id, jokusor_name, slot_start, slot_end). It:
--   1. Resolves module → estimated_duration_min.
--   2. Resolves address → point + postal_code.
--   3. For each active jokusor that serves this address (via jokusor_serves_address),
--      iterates days in [from, to], reads working_hours[dow], builds slot windows
--      of duration_min, and filters out windows overlapping existing bookings
--      (status IN hold/confirmed/in_progress on time_slots).
--
-- Working hours interpreted in Europe/Warsaw (handles DST). Slots in the past
-- are filtered out. SECURITY DEFINER so residents can call without seeing
-- other users' time_slots (only the function's filtered output leaks out).

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
  -- 1. Resolve module (modules table has no is_active flag; all seeded modules
  -- are is_global=true. Per-estate activation lives in module_activations
  -- and is not enforced here — slot picker is module-agnostic).
  SELECT id, estimated_duration_min INTO v_module_id, v_duration_min
  FROM modules
  WHERE slug = p_module_slug;

  IF v_module_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Resolve address
  SELECT point, postal_code INTO v_addr_point, v_addr_postal
  FROM addresses
  WHERE id = p_address_id;

  IF v_addr_postal IS NULL THEN
    RETURN;
  END IF;

  -- Date bounds in Europe/Warsaw
  v_from_date := (p_from AT TIME ZONE 'Europe/Warsaw')::date;
  v_to_date   := (p_to   AT TIME ZONE 'Europe/Warsaw')::date;

  -- 3. For each active jokusor serving this address
  FOR j IN
    SELECT
      jk.user_id,
      u.full_name,
      jk.working_hours,
      jk.vacation_until
    FROM jokusors jk
    JOIN users u ON u.id = jk.user_id
    WHERE jk.is_active
      AND (jk.vacation_until IS NULL OR jk.vacation_until < v_now::date)
      AND jokusor_serves_address(jk.user_id, v_addr_point, v_addr_postal)
  LOOP
    -- Iterate days in range
    FOR v_day IN
      SELECT v_from_date + i
      FROM generate_series(0, v_to_date - v_from_date) i
    LOOP
      v_dow := EXTRACT(DOW FROM v_day)::int;
      v_day_hours := j.working_hours -> v_dow::text;

      -- Skip if day has no hours (null or missing key)
      IF v_day_hours IS NULL OR v_day_hours = 'null'::jsonb THEN
        CONTINUE;
      END IF;

      v_from_time := (v_day_hours ->> 'from')::time;
      v_to_time   := (v_day_hours ->> 'to')::time;

      -- Build slot windows for this day, stepping by duration_min
      v_slot_start := (v_day::text || ' ' || v_from_time::text)::timestamp
                        AT TIME ZONE 'Europe/Warsaw';

      WHILE v_slot_start + make_interval(mins => v_duration_min) <=
            (v_day::text || ' ' || v_to_time::text)::timestamp AT TIME ZONE 'Europe/Warsaw'
      LOOP
        v_slot_end := v_slot_start + make_interval(mins => v_duration_min);

        -- Filter: must be in [p_from, p_to] AND in the future
        IF v_slot_start >= p_from
           AND v_slot_end <= p_to
           AND v_slot_start > v_now
        THEN
          -- No overlap with existing bookings
          IF NOT EXISTS (
            SELECT 1 FROM time_slots ts
            WHERE ts.jokusor_id = j.user_id
              AND ts.status IN ('hold', 'confirmed', 'in_progress')
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

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, text, timestamptz, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_available_slots(uuid, text, timestamptz, timestamptz) IS
  'Sprint 3a slot generator. Given an address + module, returns available time windows '
  'from all jokusors serving that address, respecting working_hours and existing bookings. '
  'Working hours interpreted in Europe/Warsaw.';
