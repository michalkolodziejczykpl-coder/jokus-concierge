-- Review NTH-2 (2026-05-30): let a jokusor delete/replace their own files.

drop policy if exists "jokusor_docs_delete_own" on storage.objects;
create policy "jokusor_docs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'jokusor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "jokusor_photos_delete_own" on storage.objects;
create policy "jokusor_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'jokusor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
