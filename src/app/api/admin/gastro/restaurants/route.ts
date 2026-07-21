// POST /api/admin/gastro/restaurants — create a restaurant partner (the payer
// of gastro courses). Admin-only; service-role write like the other admin
// mutation routes.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { restaurantSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = restaurantSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const d = parsed.data;
  const { data, error } = await admin
    .from('restaurants')
    .insert({
      name: d.name,
      nip: d.nip || null,
      address: d.address || null,
      contact_email: d.contact_email || null,
      contact_phone: d.contact_phone || null,
      is_active: d.is_active,
      notes: d.notes || null
    })
    .select('id')
    .single();

  if (error) {
    console.error('[POST /api/admin/gastro/restaurants] insert', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
