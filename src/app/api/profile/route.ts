// PATCH /api/profile — resident edits name, phone and their default address.
// users_update_own RLS forbids changing role; addresses_owner_all lets the
// owner update/insert their address.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { residentProfileSchema } from '@/lib/utils/validators';

export async function PATCH(request: Request) {
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

  const parsed = residentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { full_name, phone, address } = parsed.data;
  const now = new Date().toISOString();

  const { error: uErr } = await supabase
    .from('users')
    .update({ full_name, phone: phone || null, updated_at: now } as never)
    .eq('id', user.id);
  if (uErr) {
    console.error('[PATCH /api/profile] users', uErr);
    return NextResponse.json({ error: 'user_update_failed', message: uErr.message }, { status: 500 });
  }

  const addrPayload = {
    estate_id: address.estate_id,
    street: address.street,
    building: address.building,
    apartment: address.apartment || null,
    city: address.city,
    postal_code: address.postal_code,
    updated_at: now
  };

  const { data: updated, error: aErr } = await supabase
    .from('addresses')
    .update(addrPayload as never)
    .eq('user_id', user.id)
    .eq('is_default', true)
    .select('id');
  if (aErr) {
    console.error('[PATCH /api/profile] address update', aErr);
    return NextResponse.json({ error: 'address_update_failed', message: aErr.message }, { status: 500 });
  }

  // No default address yet → create one.
  if (!updated || (updated as { id: string }[]).length === 0) {
    const { error: insErr } = await supabase
      .from('addresses')
      .insert({ ...addrPayload, user_id: user.id, label: 'Dom', is_default: true } as never);
    if (insErr) {
      console.error('[PATCH /api/profile] address insert', insErr);
      return NextResponse.json({ error: 'address_insert_failed', message: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
