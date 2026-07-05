// PATCH/DELETE /api/admin/modules/[id] — edit or remove a module. Admin only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { moduleSchema } from '@/lib/utils/validators';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .update({
      slug: d.slug,
      name: d.name,
      description: d.description || null,
      category: d.category,
      icon_name: d.icon_name || null,
      base_price: d.base_price,
      price_unit: d.price_unit,
      min_price: d.min_price,
      estimated_duration_min: d.estimated_duration_min,
      requires_pickup: d.requires_pickup,
      requires_age_verification: d.requires_age_verification,
      is_global: d.is_global,
      sort_order: d.sort_order,
      updated_at: new Date().toISOString()
    } as never)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === '23505')
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
    console.error('[PATCH /api/admin/modules/[id]] update', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id }, { status: 200 });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const supabase = await createClient();
  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) {
    // FK violation → module is referenced by orders/activations.
    if ((error as { code?: string }).code === '23503')
      return NextResponse.json({ error: 'module_in_use' }, { status: 409 });
    console.error('[DELETE /api/admin/modules/[id]]', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
