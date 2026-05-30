// PUT /api/admin/estates/[id]/activations — upsert one module's activation +
// price override for this estate. Admin only (activations_write_admin).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/guards';
import { moduleActivationSchema } from '@/lib/utils/validators';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: estateId } = await params;
  if (!UUID_RE.test(estateId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = moduleActivationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('module_activations').upsert(
    {
      module_id: d.module_id,
      estate_id: estateId,
      active: d.active,
      price_override: d.price_override ?? null,
      activated_by: user?.id ?? null,
      activated_at: new Date().toISOString()
    } as never,
    { onConflict: 'module_id,estate_id' }
  );

  if (error) {
    console.error('[PUT /api/admin/estates/[id]/activations] upsert', error);
    return NextResponse.json({ error: 'upsert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
