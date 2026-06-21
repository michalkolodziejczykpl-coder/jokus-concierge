import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { productSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
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
    .insert({
      category_id: d.category_id,
      name: d.name,
      brand: d.brand || null,
      unit: d.unit,
      estimated_price: d.estimated_price,
      image_url: d.image_url || null,
      is_active: d.is_active,
      sort_order: d.sort_order,
      old_price: d.old_price ?? null,
      badge: d.badge || null
    } as never)
    .select('id')
    .single();
  if (error) {
    console.error('[POST /api/admin/products]', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
