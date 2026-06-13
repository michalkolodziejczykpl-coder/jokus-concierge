// POST /api/register/confirm-phone — step 3 of email registration.
//
// SECURITY: this is the ONLY place `users.phone_verified` is flipped to true.
// We never trust the client's word that the phone is verified. The browser has
// already run supabase.auth.verifyOtp({ type: 'phone_change' }); once that
// succeeds Supabase stamps `phone_confirmed_at` on the auth user. This endpoint
// re-reads the auth user server-side and only proceeds when:
//   1. phone_confirmed_at is set, AND
//   2. the confirmed auth phone matches the phone we're about to store.
// Without (1) the flip is rejected — so a user cannot self-grant verification
// by calling PATCH /api/profile or this endpoint without the SMS round-trip.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { confirmPhoneSchema } from '@/lib/utils/validators';

// Compare phone numbers by their digits only — Supabase stores the auth phone
// in E.164 without the leading '+' (e.g. "48123456789"), while we keep our
// canonical "+48123456789".
function digits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = confirmPhoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { phone } = parsed.data;

  // Trust boundary: the phone must be confirmed on the auth user...
  if (!user.phone_confirmed_at) {
    return NextResponse.json({ error: 'phone_not_confirmed' }, { status: 400 });
  }
  // ...and it must be the same number we're about to mark verified.
  if (digits(user.phone) !== digits(phone)) {
    return NextResponse.json({ error: 'phone_mismatch' }, { status: 400 });
  }

  const { error: uErr } = await supabase
    .from('users')
    .update({ phone, phone_verified: true, updated_at: new Date().toISOString() } as never)
    .eq('id', user.id);
  if (uErr) {
    console.error('[POST /api/register/confirm-phone]', uErr);
    return NextResponse.json(
      { error: 'user_update_failed', message: uErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
