// POST /api/orders/[id]/rating — resident rates the jokusor after completion.
// RLS ratings_insert_resident also enforces: resident owns a COMPLETED order.
// One rating per order (order_id is the PK) → duplicate returns 409.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ratingSchema } from '@/lib/utils/validators';

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ratingSchema.safeParse(raw);
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
  const order = orderRow as { resident_id: string; jokusor_id: string | null; status: string } | null;
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.resident_id !== user.id)
    return NextResponse.json({ error: 'not_your_order' }, { status: 403 });
  if (order.status !== 'completed')
    return NextResponse.json({ error: 'order_not_completed' }, { status: 409 });
  if (!order.jokusor_id)
    return NextResponse.json({ error: 'no_jokusor' }, { status: 409 });

  const { error } = await supabase.from('ratings').insert({
    order_id: id,
    resident_id: user.id,
    jokusor_id: order.jokusor_id,
    stars: parsed.data.stars,
    comment: parsed.data.comment || null
  } as never);

  if (error) {
    if ((error as { code?: string }).code === '23505')
      return NextResponse.json({ error: 'already_rated' }, { status: 409 });
    console.error('[POST /api/orders/[id]/rating] insert', error);
    return NextResponse.json({ error: 'rating_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
