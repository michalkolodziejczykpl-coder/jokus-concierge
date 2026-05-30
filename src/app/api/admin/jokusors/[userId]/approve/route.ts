// POST /api/admin/jokusors/[userId]/approve — admin approves a jokusor application.
// Caller must be an admin. Uses the service-role client to flip users.role to
// 'jokusor' and activate the jokusors row (both bypass RLS deliberately).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' as const, status: 401 };
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return { error: 'forbidden' as const, status: 403 };
  }
  return { error: null };
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: jErr } = await admin
    .from('jokusors')
    .update({ onboarding_status: 'approved', is_active: true, updated_at: now } as never)
    .eq('user_id', userId);
  if (jErr) {
    console.error('[approve] jokusors update', jErr);
    return NextResponse.json({ error: 'update_failed', message: jErr.message }, { status: 500 });
  }

  const { error: uErr } = await admin
    .from('users')
    .update({ role: 'jokusor', updated_at: now } as never)
    .eq('id', userId);
  if (uErr) {
    console.error('[approve] role flip', uErr);
    return NextResponse.json({ error: 'role_flip_failed', message: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
