// POST /api/register/profile — step 2 of email registration.
//
// Saves the resident's display name and (not-yet-verified) phone number on
// their own `public.users` row. The phone is stored here purely so the value
// survives a page reload; it is NOT trusted until the SMS OTP round-trip flips
// `phone_verified` via /api/register/confirm-phone.
//
// RLS (users_update_own) lets the user write their own row; role can't change.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerProfileSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Belt-and-suspenders (2026-07-22): the phone/OTP step must be unreachable
  // for accounts that never confirmed their e-mail. The login gate already
  // enforces this (unconfirmed accounts cannot sign in at all); this check
  // keeps it true even if that gate ever changes. Google accounts arrive with
  // email_confirmed_at set.
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'email_not_confirmed' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = registerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { full_name, phone } = parsed.data;

  const { error: uErr } = await supabase
    .from('users')
    .update({ full_name, phone, updated_at: new Date().toISOString() } as never)
    .eq('id', user.id);
  if (uErr) {
    console.error('[POST /api/register/profile]', uErr);
    return NextResponse.json(
      { error: 'user_update_failed', message: uErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
