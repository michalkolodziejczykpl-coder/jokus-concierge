// POST /api/admin/jokusors/[userId]/reject — admin rejects a jokusor application.
// Caller must be an admin. Marks the jokusors row rejected + inactive; the
// user's role stays 'resident'.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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
