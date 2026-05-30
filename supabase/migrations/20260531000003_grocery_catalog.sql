-- Sprint G1: grocery catalog. Global product catalog (admin-managed) feeding the
-- "Zakupy" module. Prices are ESTIMATES (final settled from the receipt later).

create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table product_categories enable row level security;
drop policy if exists "product_categories_read_all" on product_categories;
create policy "product_categories_read_all" on product_categories for select using (true);
drop policy if exists "product_categories_write_admin" on product_categories;
create policy "product_categories_write_admin" on product_categories for all using (is_admin());

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories(id) on delete set null,
  name text not null,
  brand text,
  unit text not null default 'szt.',
  estimated_price numeric(10,2) not null check (estimated_price >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_category on products(category_id) where is_active;
create index if not exists idx_products_active on products(is_active, sort_order);

alter table products enable row level security;
drop policy if exists "products_read_all" on products;
create policy "products_read_all" on products for select using (true);
drop policy if exists "products_write_admin" on products;
create policy "products_write_admin" on products for all using (is_admin());

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function trigger_set_updated_at();

-- Public bucket for product images; only admins write.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_write_admin" on storage.objects;
create policy "product_images_write_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and is_admin());
drop policy if exists "product_images_update_admin" on storage.objects;
create policy "product_images_update_admin" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and is_admin());
drop policy if exists "product_images_delete_admin" on storage.objects;
create policy "product_images_delete_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and is_admin());
