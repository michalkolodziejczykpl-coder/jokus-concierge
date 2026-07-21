// PATCH /api/admin/gastro/restaurants/[id] — edit a restaurant partner.
// Admin-only; service-role write.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { restaurantSchema } from '@/lib/utils/validators';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

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
    .update({
      name: d.name,
      nip: d.nip || null,
      address: d.address || null,
      contact_email: d.contact_email || null,
      contact_phone: d.contact_phone || null,
      is_active: d.is_active,
      notes: d.notes || null
    })
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('[PATCH /api/admin/gastro/restaurants/[id]] update', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
