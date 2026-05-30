-- Sprint D-2: marketplace listing reporting.
-- A non-owner cannot UPDATE someone else's listing (RLS listings_update_own),
-- so report_listing is SECURITY DEFINER: it bumps reports_count and, at a
-- threshold of 3 reports, flips moderation_status to 'pending' for admin review.
-- NOTE: no per-user report dedupe yet (no reports table) — a user can report
-- the same listing more than once. Acceptable for MVP; revisit with a
-- marketplace_reports table if abuse appears.

create or replace function report_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_count integer;
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
