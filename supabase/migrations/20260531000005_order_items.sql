-- Sprint G3: grocery order lines (snapshot of the cart at checkout) + a seeded
-- "Zakupy spożywcze" module the checkout attaches orders to.

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name_snapshot text not null,
  unit text not null,
  quantity integer not null check (quantity > 0),
  estimated_unit_price numeric(10,2) not null,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order on order_items(order_id);

alter table order_items enable row level security;

drop policy if exists "order_items_read" on order_items;
create policy "order_items_read" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.resident_id = auth.uid() or o.jokusor_id = auth.uid())
    )
    or is_admin()
  );

drop policy if exists "order_items_insert_own" on order_items;
create policy "order_items_insert_own" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.resident_id = auth.uid())
  );

-- Seed the grocery module (no-op if it already exists). base_price is the
-- service fee; admin can edit it in /modules.
insert into modules (slug, name, description, category, base_price, price_unit, estimated_duration_min, requires_pickup, is_global, sort_order, custom_fields)
values ('zakupy-spozywcze', 'Zakupy spożywcze', 'Zrobimy zakupy z Twojego koszyka i dostarczymy pod drzwi.', 'shopping', 15.00, 'fixed', 60, true, true, 5, '[]')
on conflict (slug) do nothing;
