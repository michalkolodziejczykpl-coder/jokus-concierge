-- Billing v3: uniform 80/20 split driven by versioned fee_config + gastro.
--
-- Business rules confirmed by the owner (2026-07-21; replaces the 50/50 rule
-- of 20260706000001 where they conflict):
--   * SPLIT: one general rule for ALL order types — jokusor 80%, platform 20%.
--     Source of truth: fee_config, one row per (order_type, effective_from).
--     New terms = new row, NEVER an UPDATE (enforced via RLS: no update/delete
--     policy exists, so nothing short of the service role can rewrite history).
--   * jokusors.payout_share becomes an OPTIONAL per-jokusor exception:
--     effective share = COALESCE(jokusors.payout_share, fee_config.jokusor_share).
--     Existing rows carried an explicit 0.5000 (old default) — those are reset
--     to NULL so every current jokusor inherits the 80% rule; only a
--     deliberately set value survives as an exception.
--   * FREEZING (extends the orders.base_price rule): at payment time
--     (mock_pay_order today, the P24 webhook later) the order freezes
--     fee_config_id, jokusor_share_frozen (effective share) and
--     cashback_pct_frozen. Settlements read ONLY the *_frozen columns — later
--     admin changes never rewrite closed months.
--     Backfill: existing orders get jokusor_share_frozen = 0.50 (that is how
--     they were settled), fee_config_id stays NULL (historical).
--   * GASTRO: restaurant-paid outsourced delivery. 19.99 zł net per course up
--     to 5 km, +2.50 zł per further started km. No end-client online payment;
--     weekly per-restaurant statement (view/CSV export) for a collective
--     invoice. Kept OUT of `orders` on purpose: orders requires
--     resident_id/address_id NOT NULL and its RLS/lifecycle serve the
--     consumer pipeline — a dedicated gastro_orders table cannot disturb it.
--   * SKARBONKA (cashback): out of MVP. cashback_pct = 0; the columns exist
--     only as a future gate.
--   * Grocery consumer fee: minimum raised 10.00 → 14.90 zł (rate stays 5%,
--     both still live on the module row — fee_config does NOT duplicate
--     module pricing).
--
-- NOT applied automatically. Owner applies manually via the Supabase SQL
-- Editor (repo convention), then regenerates src/lib/types/database.ts.
--
-- The whole migration runs inside one transaction — it applies fully or not
-- at all. The final SELECT (after COMMIT) is the verification report.

BEGIN;

-- ===========================================================================
-- (A) fee_config — versioned split & platform parameters per order type
-- ===========================================================================

CREATE TABLE fee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type text NOT NULL CHECK (order_type IN ('consumer', 'gastro')),
  effective_from timestamptz NOT NULL DEFAULT now(),
  jokusor_share numeric(5,4) NOT NULL
    CHECK (jokusor_share >= 0 AND jokusor_share <= 1),
  -- Gastro parameters (NULL for consumer rows): net base fee, kilometres it
  -- covers, and the fee per further started kilometre.
  gastro_base_fee numeric(10,2) CHECK (gastro_base_fee IS NULL OR gastro_base_fee >= 0),
  gastro_included_km numeric(5,2) CHECK (gastro_included_km IS NULL OR gastro_included_km >= 0),
  gastro_per_km_fee numeric(10,2) CHECK (gastro_per_km_fee IS NULL OR gastro_per_km_fee >= 0),
  -- Who absorbs the payment-provider cost: 'platform' (start), 'pre_split'
  -- (deducted before the split), 'client' (added on top).
  payment_cost_mode text NOT NULL DEFAULT 'platform'
    CHECK (payment_cost_mode IN ('platform', 'pre_split', 'client')),
  -- Skarbonka gate — 0 for the MVP, no wallet/UI exists.
  cashback_pct numeric(5,4) NOT NULL DEFAULT 0
    CHECK (cashback_pct >= 0 AND cashback_pct <= 1),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (order_type, effective_from),
  CONSTRAINT fee_config_gastro_params CHECK (
    order_type <> 'gastro'
    OR (gastro_base_fee IS NOT NULL
        AND gastro_included_km IS NOT NULL
        AND gastro_per_km_fee IS NOT NULL)
  )
);

CREATE INDEX idx_fee_config_lookup ON fee_config(order_type, effective_from DESC);

ALTER TABLE fee_config ENABLE ROW LEVEL SECURITY;

-- Read: any logged-in user (jokusors see their split, checkout reads terms).
-- Write: admin may only INSERT new versions. No UPDATE/DELETE policies on
-- purpose — history is append-only for everyone below the service role.
CREATE POLICY "fee_config_read_authenticated" ON fee_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fee_config_insert_admin" ON fee_config
  FOR INSERT WITH CHECK (is_admin());

-- The active row for an order type at a point in time.
CREATE OR REPLACE FUNCTION public.current_fee_config(
  p_order_type text,
  p_at timestamptz DEFAULT now()
)
RETURNS public.fee_config
LANGUAGE sql
STABLE
AS $$
  SELECT fc
  FROM public.fee_config fc
  WHERE fc.order_type = p_order_type
    AND fc.effective_from <= p_at
  ORDER BY fc.effective_from DESC
  LIMIT 1;
$$;

-- Seed the 2026-07-21 rules: 80/20 everywhere, gastro 19.99 / 5 km / 2.50.
INSERT INTO fee_config (order_type, jokusor_share, payment_cost_mode, cashback_pct)
VALUES ('consumer', 0.8000, 'platform', 0);

INSERT INTO fee_config
  (order_type, jokusor_share, gastro_base_fee, gastro_included_km,
   gastro_per_km_fee, payment_cost_mode, cashback_pct)
VALUES ('gastro', 0.8000, 19.99, 5, 2.50, 'platform', 0);

-- ===========================================================================
-- (B) jokusors.payout_share — from "the rule" to "an optional exception"
-- ===========================================================================

ALTER TABLE jokusors ALTER COLUMN payout_share DROP NOT NULL;
ALTER TABLE jokusors ALTER COLUMN payout_share DROP DEFAULT;

-- Existing rows hold an explicit 0.5000 written by the old default. NULL them
-- so every current jokusor inherits the general 80% rule; from now on a
-- non-NULL payout_share means a deliberate per-jokusor exception.
UPDATE jokusors SET payout_share = NULL WHERE payout_share = 0.5000;

-- ===========================================================================
-- (C) orders — frozen settlement terms
-- ===========================================================================

-- NOTE: both *_frozen columns hold 0–1 FRACTIONS (rates), never złoty
-- amounts — hence the _pct_ in cashback_pct_frozen. Any settlement math must
-- multiply a price by them.
ALTER TABLE orders
  ADD COLUMN jokusor_share_frozen numeric(5,4)
    CHECK (jokusor_share_frozen IS NULL
           OR (jokusor_share_frozen >= 0 AND jokusor_share_frozen <= 1)),
  ADD COLUMN cashback_pct_frozen numeric(5,4)
    CHECK (cashback_pct_frozen IS NULL
           OR (cashback_pct_frozen >= 0 AND cashback_pct_frozen <= 1)),
  ADD COLUMN fee_config_id uuid REFERENCES fee_config(id);

-- Backfill: every existing order was settled at the old 50/50 model — freeze
-- that fact. Deliberately NOT re-priced to the new 80/20 terms.
-- fee_config_id stays NULL (no config row existed when they were priced).
UPDATE orders
SET jokusor_share_frozen = 0.5000,
    cashback_pct_frozen  = 0
WHERE jokusor_share_frozen IS NULL;

-- ===========================================================================
-- (D) Grocery: consumer minimum 10.00 → 14.90 zł (rate stays 5% on the module)
-- ===========================================================================

UPDATE modules
SET min_price = 14.90
WHERE slug = 'zakupy-spozywcze' AND price_unit = 'percent';

-- ===========================================================================
-- (E) mock_pay_order — freeze the terms at payment time
-- ===========================================================================
-- Same body as 20260526000001 plus the freeze. The jokusor is already pinned
-- (create_slot_hold sets orders.jokusor_id before payment), so the effective
-- share is resolvable here. The future P24 webhook must do the same freeze.

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
  v_cfg fee_config;
  v_payout_share numeric(5,4);
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

  -- Invariant: create_slot_hold (the only path into status='hold') always
  -- pins the jokusor, and cancel_slot_hold clears it together with the
  -- rollback to 'draft'. Guard explicitly so a future code path can never
  -- freeze the general share for an order whose jokusor has an exception.
  IF v_order.jokusor_id IS NULL THEN
    RAISE EXCEPTION 'order_without_jokusor' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve the settlement terms to freeze on the order.
  v_cfg := current_fee_config('consumer');
  IF v_cfg.id IS NULL THEN
    RAISE EXCEPTION 'fee_config_missing' USING ERRCODE = 'P0001';
  END IF;

  SELECT payout_share INTO v_payout_share
  FROM jokusors
  WHERE user_id = v_order.jokusor_id;

  -- Promote order + freeze terms (effective share: exception ?? general rule)
  UPDATE orders
  SET status               = 'pending',
      fee_config_id        = v_cfg.id,
      jokusor_share_frozen = COALESCE(v_payout_share, v_cfg.jokusor_share),
      cashback_pct_frozen  = v_cfg.cashback_pct
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
-- (F) Gastro: restaurants + courses (restaurant is the payer)
-- ===========================================================================

CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nip text,
  address text,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Idempotent (re)definition so this migration does not depend on the initial
-- schema's helper being present under this exact name. Same body as
-- 20260516000001; CREATE OR REPLACE is a no-op if it already matches.
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- One delivery course done for a restaurant. Fee and split are FROZEN at
-- insert time (computed from current_fee_config('gastro') + the jokusor's
-- optional exception) — later config rows never reprice logged courses.
CREATE TABLE gastro_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  jokusor_id uuid NOT NULL REFERENCES jokusors(user_id),
  delivered_on date NOT NULL,
  distance_km numeric(6,2) NOT NULL CHECK (distance_km > 0 AND distance_km <= 100),
  -- Net fee charged to the restaurant, frozen at insert.
  fee numeric(10,2) NOT NULL CHECK (fee >= 0),
  jokusor_share_frozen numeric(5,4) NOT NULL
    CHECK (jokusor_share_frozen >= 0 AND jokusor_share_frozen <= 1),
  fee_config_id uuid NOT NULL REFERENCES fee_config(id),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gastro_orders_restaurant_day ON gastro_orders(restaurant_id, delivered_on);
CREATE INDEX idx_gastro_orders_jokusor_day ON gastro_orders(jokusor_id, delivered_on);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurants_admin_all" ON restaurants
  FOR ALL USING (is_admin());

-- A jokusor may read the restaurants they have delivered for (names on the
-- earnings statement).
CREATE POLICY "restaurants_jokusor_read_linked" ON restaurants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gastro_orders g
      WHERE g.restaurant_id = restaurants.id AND g.jokusor_id = auth.uid()
    )
  );

ALTER TABLE gastro_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gastro_orders_admin_all" ON gastro_orders
  FOR ALL USING (is_admin());

CREATE POLICY "gastro_orders_jokusor_read_own" ON gastro_orders
  FOR SELECT USING (jokusor_id = auth.uid());

COMMIT;

-- ===========================================================================
-- VERIFICATION — runs after COMMIT; the SQL Editor shows this result table.
-- Send the output back for review. Expected values in the "expected" column.
-- ===========================================================================

SELECT 'fee_config rows (type / share / gastro params)' AS check_name,
       string_agg(
         order_type || ': share=' || jokusor_share ||
         COALESCE(', base=' || gastro_base_fee || ', km=' || gastro_included_km
                  || ', per_km=' || gastro_per_km_fee, ''),
         ' | ' ORDER BY order_type
       ) AS actual,
       'consumer: share=0.8000 | gastro: share=0.8000, base=19.99, km=5.00, per_km=2.50' AS expected
FROM fee_config
UNION ALL
SELECT 'jokusors with payout_share exception (should be none)',
       COALESCE(string_agg(user_id::text || '=' || payout_share, ' | '), 'none'),
       'none'
FROM jokusors WHERE payout_share IS NOT NULL
UNION ALL
SELECT 'grocery module minimum',
       (SELECT 'min=' || min_price || ', rate=' || base_price || '%, unit=' || price_unit
        FROM modules WHERE slug = 'zakupy-spozywcze'),
       'min=14.90, rate=5.00%, unit=percent'
UNION ALL
SELECT 'orders backfilled to frozen 50%',
       (SELECT count(*)::text FROM orders WHERE jokusor_share_frozen = 0.5000)
         || ' of ' || (SELECT count(*)::text FROM orders) || ' orders',
       'N of N (both numbers equal)'
UNION ALL
SELECT 'orders with NULL frozen share (should be none)',
       (SELECT count(*)::text FROM orders WHERE jokusor_share_frozen IS NULL),
       '0'
UNION ALL
SELECT 'new tables exist',
       (SELECT string_agg(table_name, ', ' ORDER BY table_name)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('fee_config', 'restaurants', 'gastro_orders')),
       'fee_config, gastro_orders, restaurants';
