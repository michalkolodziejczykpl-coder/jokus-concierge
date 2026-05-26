// DELETE /api/slots/hold/[id]
//
// Cancels an active hold. Delegates to SECURITY DEFINER SQL function
// `cancel_slot_hold` which:
//   - marks time_slots.status = 'cancelled'
//   - rolls the order back to 'draft' (if it was still in 'hold')
//   - verifies ownership via auth.uid()
//
// Idempotent: re-running on an already-cancelled slot returns 204.
// Used both by user-clicked "Anuluj" AND by the client countdown when
// it hits zero — in either case the order should be back to draft so the
// user can pick a different slot.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { error } = await supabase.rpc('cancel_slot_hold' as never, {
    p_time_slot_id: id
  } as never);

  if (error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('slot_not_found')) {
      return NextResponse.json({ error: 'slot_not_found' }, { status: 404 });
    }
    if (msg.includes('slot_not_owned')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (msg.includes('slot_not_in_hold')) {
      return NextResponse.json({ error: 'slot_not_in_hold' }, { status: 409 });
    }

    console.error('[DELETE /api/slots/hold/[id]] rpc', error);
    return NextResponse.json(
      { error: 'cancel_failed', message: error.message },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
