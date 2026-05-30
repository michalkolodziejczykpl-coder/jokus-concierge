// POST /api/orders/[id]/messages — send a chat message about an order.
// The recipient is derived server-side as the OTHER party on the order
// (resident <-> assigned jokusor). Caller must be one of the two parties.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  content: z.string().trim().min(1, 'Wpisz treść').max(2000)
});

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { data: orderRow, error: oErr } = await supabase
    .from('orders')
    .select('id, resident_id, jokusor_id')
    .eq('id', id)
    .maybeSingle();
  if (oErr) {
    console.error('[POST /api/orders/[id]/messages] order fetch', oErr);
    return NextResponse.json({ error: 'order_lookup_failed' }, { status: 500 });
  }
  const order = orderRow as { resident_id: string; jokusor_id: string | null } | null;
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });

  let recipientId: string | null = null;
  if (user.id === order.resident_id) recipientId = order.jokusor_id;
  else if (user.id === order.jokusor_id) recipientId = order.resident_id;
  else return NextResponse.json({ error: 'not_a_participant' }, { status: 403 });

  if (!recipientId) {
    return NextResponse.json({ error: 'no_counterparty_yet' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('order_messages')
    .insert({
      order_id: id,
      sender_id: user.id,
      recipient_id: recipientId,
      content: parsed.data.content
    } as never)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[POST /api/orders/[id]/messages] insert', error);
    return NextResponse.json({ error: 'send_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
