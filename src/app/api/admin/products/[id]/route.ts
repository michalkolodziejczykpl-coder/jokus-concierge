import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { productSchema } from '@/lib/utils/validators';

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
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .update({
      category_id: d.category_id,
      name: d.name,
      brand: d.brand || null,
      unit: d.unit,
      estimated_price: d.estimated_price,
      image_url: d.image_url || null,
      is_active: d.is_active,
      sort_order: d.sort_order,
      old_price: d.old_price ?? null,
      badge: d.badge || null,
      updated_at: new Date().toISOString()
    } as never)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
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
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    if ((error as { code?: string }).code === '23503')
      return NextResponse.json({ error: 'product_in_use' }, { status: 409 });
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
