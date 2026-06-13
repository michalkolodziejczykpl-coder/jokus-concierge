// POST /api/orders/[id]/start
//
// Jokusor starts an order in 'accepted' status → 'in_progress'.
// Skips the spec's intermediate in_transit/at_pickup statuses for sprint 4
// simplicity. Tracking module (sprint 5+) will reintroduce those transitions
// driven by GPS checkpoints.

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
    'jokusor_start_order' as never,
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
    if (msg.includes('order_not_accepted'))
      return NextResponse.json(
        { error: 'order_not_accepted', message: 'Zlecenie nie jest w stanie zaakceptowanym.' },
        { status: 409 }
      );

    console.error('[POST /api/orders/[id]/start] rpc', error);
    return NextResponse.json({ error: 'start_failed', message: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
