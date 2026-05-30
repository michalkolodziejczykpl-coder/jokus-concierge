-- Sprint E: jokusor self-onboarding.
--
-- Adds: an OC-insurance document column, an INSERT policy so a resident can
-- create their OWN pending application (previously only admins could insert),
-- and a PRIVATE storage bucket for sensitive documents (background check, OC).
--
-- Security: the insert policy forces a safe initial state (inactive +
-- pending/documents_review) so a resident cannot self-approve into an active
-- jokusor. Only admins (jokusors_admin_all) may flip is_active / onboarding_status
-- to 'approved'. Role itself lives in users.role and is changed by the admin
-- approve endpoint via the service role.

alter table jokusors add column if not exists insurance_doc_url text;

drop policy if exists "jokusors_insert_own" on jokusors;
create policy "jokusors_insert_own" on jokusors
  for insert
  with check (
    user_id = auth.uid()
    and is_active = false
    and onboarding_status in ('pending', 'documents_review')
  );

-- Private bucket for sensitive documents.
insert into storage.buckets (id, name, public)
values ('jokusor-documents', 'jokusor-documents', false)
on conflict (id) do nothing;

-- Upload only into your own {uid}/ folder.
drop policy if exists "jokusor_docs_insert_own" on storage.objects;
create policy "jokusor_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'jokusor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read your own documents. Admins read via the service role (bypasses RLS),
-- so no admin SELECT policy is needed here.
drop policy if exists "jokusor_docs_select_own" on storage.objects;
create policy "jokusor_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'jokusor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
