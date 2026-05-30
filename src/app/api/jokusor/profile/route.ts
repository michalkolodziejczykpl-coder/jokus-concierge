// PATCH /api/jokusor/profile — jokusor edits name, phone, bio, service area,
// business data and public photo. users_update_own + jokusors_update_own.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jokusorProfileSchema } from '@/lib/utils/validators';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Must already be a jokusor.
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'jokusor') {
    return NextResponse.json({ error: 'not_a_jokusor' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = jokusorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  // Photo must be a public URL of an object in our own jokusor-photos bucket,
  // under the caller's own folder. Otherwise a jokusor could set an arbitrary
  // external URL as their public photo (tracking pixel, defacement, etc).
  if (d.public_photo_url) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/jokusor-photos/${user.id}/`;
    if (!d.public_photo_url.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'invalid_photo_url' }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  const { error: uErr } = await supabase
    .from('users')
    .update({ full_name: d.full_name, phone: d.phone || null, updated_at: now } as never)
    .eq('id', user.id);
  if (uErr) {
    console.error('[PATCH /api/jokusor/profile] users', uErr);
    return NextResponse.json({ error: 'user_update_failed', message: uErr.message }, { status: 500 });
  }

  const { error: jErr } = await supabase
    .from('jokusors')
    .update({
      bio: d.bio || null,
      service_postal_codes: d.service_postal_codes,
      business_name: d.business_name || null,
      nip: d.nip || null,
      bank_account: d.bank_account || null,
      public_photo_url: d.public_photo_url || null,
      updated_at: now
    } as never)
    .eq('user_id', user.id);
  if (jErr) {
    console.error('[PATCH /api/jokusor/profile] jokusors', jErr);
    return NextResponse.json({ error: 'jokusor_update_failed', message: jErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
