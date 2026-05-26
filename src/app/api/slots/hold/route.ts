// POST /api/slots/hold
//
// Reserves a slot for 90 seconds on a draft order. Delegates to the
// SECURITY DEFINER SQL function `create_slot_hold` which does the
// transactional work (insert time_slots, update orders, log event).
// The DB enforces no-overlap via the EXCLUDE USING gist constraint on
// time_slots — if another resident snags the same window first, the
// INSERT raises 23P01 and we translate it to a 409.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bodySchema = z.object({
  order_id: z.string().uuid(),
  jokusor_id: z.string().uuid(),
  slot_start: z.string().datetime({ offset: true }),
  slot_end: z.string().datetime({ offset: true })
});

type HoldRpcRow = {
  time_slot_id: string;
  hold_expires_at: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data, error } = await supabase.rpc('create_slot_hold' as never, {
    p_order_id: parsed.data.order_id,
    p_jokusor_id: parsed.data.jokusor_id,
    p_slot_start: parsed.data.slot_start,
    p_slot_end: parsed.data.slot_end
  } as never);

  if (error) {
    // Map SQL-raised messages + Postgres error codes to HTTP statuses.
    // - 'order_not_found' / 'slot_not_found' → 404
    // - 'order_not_owned'                    → 403
    // - 'order_not_draft' / 'jokusor_inactive' → 409
    // - 23P01 (exclusion_violation)          → 409 (slot just taken)
    // - other → 500
    const msg = (error.message || '').toLowerCase();
    const code = (error as { code?: string }).code;

    if (code === '23P01') {
      return NextResponse.json(
        { error: 'slot_conflict', message: 'Slot zajety - odswiez liste.' },
        { status: 409 }
      );
    }
    if (msg.includes('order_not_found') || msg.includes('slot_not_found')) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    }
    if (msg.includes('order_not_owned')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (msg.includes('order_not_draft') || msg.includes('jokusor_inactive')) {
      return NextResponse.json({ error: msg.split(' ')[0] }, { status: 409 });
    }

    console.error('[POST /api/slots/hold] rpc', error);
    return NextResponse.json(
      { error: 'hold_failed', message: error.message },
      { status: 500 }
    );
  }

  // RPC returns a single-row table; supabase-js gives us the array.
  const rows = (data as HoldRpcRow[] | null) ?? [];
  const result = rows[0];

  if (!result) {
    return NextResponse.json({ error: 'hold_failed_empty' }, { status: 500 });
  }

  return NextResponse.json(
    {
      time_slot_id: result.time_slot_id,
      hold_expires_at: result.hold_expires_at
    },
    { status: 201 }
  );
}
