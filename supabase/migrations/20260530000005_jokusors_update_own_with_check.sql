-- Review must-fix #4 (2026-05-30): jokusors_update_own had no WITH CHECK, so an
-- applicant could flip their own is_active/onboarding_status to 'approved' and
-- surface as an active jokusor in public lists. Only the admin approve endpoint
-- (service role) should change those two columns. This pins them to their prior
-- value for any direct (non-service-role) self-update.

drop policy if exists "jokusors_update_own" on jokusors;
create policy "jokusors_update_own" on jokusors
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and is_active is not distinct from (
      select j.is_active from jokusors j where j.user_id = auth.uid()
    )
    and onboarding_status is not distinct from (
      select j.onboarding_status from jokusors j where j.user_id = auth.uid()
    )
  );
