-- Sprint E (part): public photo for a jokusor ("wizerunek na terenie"), shown to
-- residents on their order. Stored in a PUBLIC bucket (read by anyone with the
-- URL; write only into your own folder).

alter table jokusors add column if not exists public_photo_url text;

insert into storage.buckets (id, name, public)
values ('jokusor-photos', 'jokusor-photos', true)
on conflict (id) do nothing;

drop policy if exists "jokusor_photos_insert_own" on storage.objects;
create policy "jokusor_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'jokusor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "jokusor_photos_update_own" on storage.objects;
create policy "jokusor_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'jokusor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
