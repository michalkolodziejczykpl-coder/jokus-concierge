-- Sprint G2: shopping cart + favorites for the grocery shop. User-owned rows.

create table if not exists cart_items (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 99),
  note text,
  added_at timestamptz default now(),
  primary key (user_id, product_id)
);

alter table cart_items enable row level security;
drop policy if exists "cart_items_owner" on cart_items;
create policy "cart_items_owner" on cart_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists favorites (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

alter table favorites enable row level security;
drop policy if exists "favorites_owner" on favorites;
create policy "favorites_owner" on favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
