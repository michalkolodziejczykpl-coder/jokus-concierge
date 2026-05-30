import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { productCategorySchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = productCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_categories')
    .insert(parsed.data as never)
    .select('id')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '23505')
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
    console.error('[POST /api/admin/product-categories]', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
