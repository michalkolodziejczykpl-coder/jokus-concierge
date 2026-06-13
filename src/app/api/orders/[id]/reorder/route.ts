// POST /api/orders/[id]/reorder — copy a past order's items back into the cart.
// Only the order's resident may reorder. Inactive/deleted products are skipped.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: orderRow } = await supabase
    .from('orders')
    .select('resident_id')
    .eq('id', id)
    .maybeSingle();
  const order = orderRow as { resident_id: string } | null;
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.resident_id !== user.id)
    return NextResponse.json({ error: 'not_your_order' }, { status: 403 });

  const { data: itemRows } = await supabase
    .from('order_items')
    .select('product_id, quantity, note')
    .eq('order_id', id);
  const items = (
    (itemRows as { product_id: string | null; quantity: number; note: string | null }[] | null) ??
    []
  ).filter((it) => it.product_id);
  if (items.length === 0)
    return NextResponse.json({ error: 'nothing_to_reorder' }, { status: 409 });

  const rows = items.map((it) => ({
    user_id: user.id,
    product_id: it.product_id,
    quantity: it.quantity,
    note: it.note
  }));
  const { error } = await supabase
    .from('cart_items')
    .upsert(rows as never, { onConflict: 'user_id,product_id' });
  if (error) {
    console.error('[reorder] upsert', error);
    return NextResponse.json({ error: 'reorder_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
