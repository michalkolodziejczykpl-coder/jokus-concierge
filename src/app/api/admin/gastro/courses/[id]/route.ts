// DELETE /api/admin/gastro/courses/[id] — remove a mis-logged course.
// There is no course edit: corrections are delete + re-add, so the frozen fee
// and share are always recomputed consistently. Admin-only.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from('gastro_orders').delete().eq('id', id).select('id');

  if (error) {
    console.error('[DELETE /api/admin/gastro/courses/[id]]', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'course_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
