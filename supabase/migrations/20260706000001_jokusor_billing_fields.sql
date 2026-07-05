-- Billing model v2 for the earnings panel (audit rec #8).
--
-- Business rules confirmed by the owner (2026-07-05, v2 — replaces the earlier
-- commission draft of this same unapplied migration):
--   * SERVICE PRICE (what the resident pays):
--       - fixed-price modules: modules.base_price (admin-editable), e.g.
--         letter/parcel 5 zł, dog walk 10 zł;
--       - percent-priced modules (price_unit='percent', grocery):
--         max(min_price, base_price% × basket value). The checkout computes
--         this and PERSISTS it into orders.base_price at transaction time —
--         the earnings panel reads that frozen value, so a later admin change
--         to the rate/minimum never rewrites closed months.
--   * SPLIT: the jokusor earns payout_share (default 50%) of each completed
--     order's service price; the platform keeps the rest. Tips are 100% the
--     jokusor's. This REPLACES the old commission concept entirely
--     (commission_rate from the initial schema stays as an unused legacy
--     column; billing_model stops driving any math).
--   * SUBSCRIPTION: mechanism stays, admin-editable, but defaults to 0 zł for
--     the MVP (jokusor #1 must not pay himself).
--   * Cancelled orders pay nothing; only status='completed' counts.
--     Statement only — invoicing is a separate, later stage.
--
-- NOT applied automatically. Owner applies manually (repo convention), then
-- regenerates src/lib/types/database.ts (`npm run supabase:types`).

-- (A) jokusors: share of the service price + subscription default.
ALTER TABLE jokusors
  ADD COLUMN payout_share numeric(5,4) NOT NULL DEFAULT 0.50
    CHECK (payout_share >= 0 AND payout_share <= 1);

ALTER TABLE jokusors
  ALTER COLUMN subscription_amount SET DEFAULT 0.00;

UPDATE jokusors
SET subscription_amount = 0.00
WHERE subscription_amount IS NULL;

-- (B) modules: minimum fee for percent-priced modules.
ALTER TABLE modules
  ADD COLUMN min_price numeric(10,2)
    CHECK (min_price IS NULL OR min_price >= 0);

-- (C) Grocery goes percent-priced: base_price now means "5% of basket value"
--     (price_unit enum has carried 'percent' since the initial schema), with
--     a 10 zł minimum. Both admin-editable in the module form.
UPDATE modules
SET price_unit = 'percent',
    base_price = 5.00,
    min_price  = 10.00
WHERE slug = 'zakupy-spozywcze';
