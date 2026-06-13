// POST /api/payments/mock-pay
//
// TEMPORARY stand-in for the Przelewy24 success webhook. Flips order.status
// 'hold' → 'pending' and time_slot 'hold' → 'confirmed'. Removed in sprint 3c.
// Gated by isMockPaymentAllowed (review must-fix #5).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMockPaymentAllowed } from '@/lib/payments/mockGate';
import { z } from 'zod';

const bodySchema = z.object({
  order_id: z.string().uuid()
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (!isMockPaymentAllowed(user.email)) {
    return NextResponse.json(
      {
        error: 'mock_payments_closed',
        message: 'Płatności są obecnie w fazie zamkniętych testów.'
      },
      { status: 403 }
    );
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

  const { error } = await supabase.rpc(
    'mock_pay_order' as never,
    {
      p_order_id: parsed.data.order_id
    } as never
  );

  if (error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('order_not_found')) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    }
    if (msg.includes('order_not_owned')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (
      msg.includes('order_not_in_hold') ||
      msg.includes('no_active_hold') ||
      msg.includes('hold_expired')
    ) {
      return NextResponse.json(
        { error: msg.split(' ')[0], message: 'Hold wygasł lub zlecenie jest poza fazą hold.' },
        { status: 409 }
      );
    }

    console.error('[POST /api/payments/mock-pay] rpc', error);
    return NextResponse.json({ error: 'pay_failed', message: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
