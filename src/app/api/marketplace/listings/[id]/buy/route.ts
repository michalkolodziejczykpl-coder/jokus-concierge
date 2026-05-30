// POST /api/marketplace/listings/[id]/buy
//
// Calls the SECURITY DEFINER SQL function `create_marketplace_purchase` which
// atomically reserves the listing, creates a draft delivery order with
// pickup_address from the listing, and links them via marketplace_purchases.
// Returns the new order_id so the client can route to the slot picker.

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
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc(
    'create_marketplace_purchase' as never,
    {
      p_listing_id: id
    } as never
  );

  if (error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('listing_not_found'))
      return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    if (msg.includes('cannot_buy_own_listing'))
      return NextResponse.json({ error: 'cannot_buy_own_listing' }, { status: 409 });
    if (msg.includes('listing_not_active'))
      return NextResponse.json({ error: 'listing_not_active' }, { status: 409 });
    if (msg.includes('buyer_no_default_address'))
      return NextResponse.json({ error: 'buyer_no_default_address' }, { status: 409 });
    if (msg.includes('marketplace_module_missing'))
      return NextResponse.json({ error: 'marketplace_module_missing' }, { status: 500 });

    console.error('[POST /api/marketplace/listings/[id]/buy] rpc', error);
    return NextResponse.json({ error: 'buy_failed', message: error.message }, { status: 500 });
  }

  // RPC returns uuid (the new order id) as the data payload
  const orderId = data as unknown as string | null;
  if (!orderId) {
    return NextResponse.json({ error: 'buy_failed_empty' }, { status: 500 });
  }

  return NextResponse.json({ order_id: orderId }, { status: 201 });
}
