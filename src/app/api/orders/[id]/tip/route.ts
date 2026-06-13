// POST /api/orders/[id]/tip — resident tips the jokusor after completion.
// MOCK PAYMENT (payment_status='paid', payment_method='mock') until P24/3c,
// and gated by isMockPaymentAllowed (review must-fix #5). RLS tips_insert_resident.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tipSchema } from '@/lib/utils/validators';
import { isMockPaymentAllowed } from '@/lib/payments/mockGate';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  if (!isMockPaymentAllowed(user.email)) {
    return NextResponse.json(
      {
        error: 'mock_payments_closed',
        message: 'Płatności są obecnie w fazie zamkniętych testów.'
      },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = tipSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data: orderRow } = await supabase
    .from('orders')
    .select('resident_id, jokusor_id, status')
    .eq('id', id)
    .maybeSingle();
  const order = orderRow as {
    resident_id: string;
    jokusor_id: string | null;
    status: string;
  } | null;
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.resident_id !== user.id)
    return NextResponse.json({ error: 'not_your_order' }, { status: 403 });
  if (order.status !== 'completed')
    return NextResponse.json({ error: 'order_not_completed' }, { status: 409 });
  if (!order.jokusor_id) return NextResponse.json({ error: 'no_jokusor' }, { status: 409 });

  const { error } = await supabase.from('tips').insert({
    order_id: id,
    resident_id: user.id,
    jokusor_id: order.jokusor_id,
    amount: parsed.data.amount,
    payment_status: 'paid',
    payment_method: 'mock'
  } as never);

  if (error) {
    console.error('[POST /api/orders/[id]/tip] insert', error);
    return NextResponse.json({ error: 'tip_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
