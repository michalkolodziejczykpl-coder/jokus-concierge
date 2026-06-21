-- Promo fields on products: a strike-through "old price" and a manual badge.
-- Discount percentage is computed in the UI from old_price vs estimated_price,
-- so it is not stored. Idempotent: safe to re-run.

alter table products add column if not exists old_price numeric(10,2) check (old_price is null or old_price >= 0);
alter table products add column if not exists badge text; -- 'hit' | 'promo' | null
