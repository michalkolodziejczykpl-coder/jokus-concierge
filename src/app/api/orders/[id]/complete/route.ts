// POST /api/orders/[id]/complete
//
// Jokusor marks an in_progress order complete. Also bumps the jokusor's
// completed_jobs_count and flips the time_slot to 'completed'.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { error } = await supabase.rpc(
    'jokusor_complete_order' as never,
    {
      p_order_id: id
    } as never
  );

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('order_not_found'))
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    if (msg.includes('not_assigned_jokusor'))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (msg.includes('order_not_in_progress'))
      return NextResponse.json(
        { error: 'order_not_in_progress', message: 'Zlecenie nie jest w toku.' },
        { status: 409 }
      );

    console.error('[POST /api/orders/[id]/complete] rpc', error);
    return NextResponse.json({ error: 'complete_failed', message: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
