// POST /api/admin/estates — create an estate. Admin only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { estateSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = estateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('estates')
    .insert({
      name: d.name,
      city: d.city,
      voivodeship: d.voivodeship || null,
      postal_codes: d.postal_codes,
      is_active: d.is_active
    } as never)
    .select('id')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505')
      return NextResponse.json({ error: 'estate_exists' }, { status: 409 });
    console.error('[POST /api/admin/estates] insert', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
