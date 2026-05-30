-- Review NTH-1 (2026-05-30): per-user dedupe for listing reports. Previously
-- report_listing bumped reports_count on every call, so one person (or alt
-- accounts) could push a listing to moderation. Now each (listing, reporter)
-- pair counts once.

create table if not exists marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace_listings(id) on delete cascade,
  reporter_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (listing_id, reporter_id)
);

alter table marketplace_reports enable row level security;

drop policy if exists "reports_insert_self" on marketplace_reports;
create policy "reports_insert_self" on marketplace_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists "reports_read_admin" on marketplace_reports;
create policy "reports_read_admin" on marketplace_reports
  for select using (is_admin());

create or replace function report_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_count integer;
  v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  select seller_id, reports_count into v_seller, v_count
  from marketplace_listings
  where id = p_listing_id
  for update;

  if v_seller is null then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if v_seller = auth.uid() then
    raise exception 'cannot_report_own' using errcode = 'P0001';
  end if;

  insert into marketplace_reports (listing_id, reporter_id)
  values (p_listing_id, auth.uid())
  on conflict (listing_id, reporter_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'already_reported' using errcode = 'P0001';
  end if;

  update marketplace_listings
  set reports_count = v_count + 1,
      moderation_status = case
        when v_count + 1 >= 3 then 'pending'
        else moderation_status
      end
  where id = p_listing_id;
end;
$$;

grant execute on function report_listing(uuid) to authenticated;
