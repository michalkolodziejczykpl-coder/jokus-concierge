-- Registration flow: mandatory phone verification (SMS OTP).
--
-- `phone_verified` is flipped to true ONLY by a server endpoint
-- (POST /api/register/confirm-phone) after it confirms the auth user's
-- `phone_confirmed_at` is set by Supabase. The column `phone` already exists.
--
-- NOTE: users_update_own RLS technically lets a user set this on their own row,
-- so the trust boundary is the server endpoint, not the column itself.

alter table public.users
  add column if not exists phone_verified boolean not null default false;
