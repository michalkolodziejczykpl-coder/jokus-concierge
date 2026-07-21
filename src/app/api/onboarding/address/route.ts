// POST /api/onboarding/address
//
// Creates the resident's first (and currently only) address with
// `is_default = true`. RLS lets the authenticated user insert their own
// addresses, so we use the server client (not admin) — the database is the
// security boundary, not this route.
//
// The unique partial index `idx_addresses_one_default` prevents a second
// default address slipping in. If the user already has one, we 409 — the
// onboarding flow should never reach this point because the page guard
// redirects users with a default address away from /onboarding/address.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addressInputSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = addressInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // Defensive: even though the form guard prevents this, double-check that
  // the user doesn't already have a default address. Without this, the
  // INSERT would fail with a unique-index violation and we'd return a less
  // helpful error. Filter on user_id explicitly — RLS is the second layer,
  // not the only one (an admin session sees every user's default, which used
  // to blow up maybeSingle and let the INSERT run into 23505).
  const { data: existing, error: existingErr } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  if (existingErr) {
    console.error('[POST /api/onboarding/address] default lookup', existingErr);
    return NextResponse.json(
      { error: 'default_lookup_failed', message: existingErr.message },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: 'address_already_exists', id: (existing as { id: string }).id },
      { status: 409 }
    );
  }

  const payload = {
    user_id: user.id,
    estate_id: input.estate_id,
    street: input.street,
    building: input.building,
    apartment: input.apartment || null,
    city: input.city,
    postal_code: input.postal_code,
    label: input.label || 'Dom',
    notes: input.notes || null,
    is_default: true
  };

  // Cast: `database.ts` is a generic stub, and supabase-js narrows the insert
  // overload to `never` when it can't resolve a concrete `Insert` type from
  // the Database generic. Runtime is unchanged. Goes away when we run
  // `supabase gen types` (REVIEW_REPORT.md #5).
  const { data, error } = await supabase
    .from('addresses')
    .insert(payload as never)
    .select('id')
    .single();

  if (error) {
    console.error('[POST /api/onboarding/address]', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
