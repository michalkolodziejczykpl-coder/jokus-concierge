// POST /api/admin/modules — create a service module. Admin only (RLS
// modules_write_admin also enforces). Slug must be unique.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { moduleSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
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
    .insert({
      slug: d.slug,
      name: d.name,
      description: d.description || null,
      category: d.category,
      icon_name: d.icon_name || null,
      base_price: d.base_price,
      price_unit: d.price_unit,
      estimated_duration_min: d.estimated_duration_min,
      requires_pickup: d.requires_pickup,
      requires_age_verification: d.requires_age_verification,
      is_global: d.is_global,
      sort_order: d.sort_order
    } as never)
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505')
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
    console.error('[POST /api/admin/modules] insert', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
