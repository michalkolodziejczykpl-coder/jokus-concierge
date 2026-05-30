// POST /api/admin/jokusors/[userId]/reject — admin rejects a jokusor application.
// Marks the jokusors row rejected + inactive; the user's role stays 'resident'.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

type RouteContext = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = createAdminClient();
  const { error } = await admin
    .from('jokusors')
    .update({
      onboarding_status: 'rejected',
      is_active: false,
      updated_at: new Date().toISOString()
    } as never)
    .eq('user_id', userId);
  if (error) {
    console.error('[reject] jokusors update', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
