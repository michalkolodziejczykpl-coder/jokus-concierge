// POST /api/sklep/checkout — turn the user's cart into a draft "Zakupy" order.
// Creates the order + order_items (price snapshot) and clears the cart, then
// returns order_id so the client can continue to the slot picker + payment.
// Prices are ESTIMATES; final total is settled from the receipt later (G4/3c).
//
// Service fee (billing v2): percent-priced module → max(min_price,
// base_price% × basket), else flat base_price. The computed fee is PERSISTED
// into orders.base_price — the earnings panel reads that frozen value, so
// later admin changes to the rate/minimum never rewrite past orders.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toGr, percentServiceFeeGr } from '@/lib/payments/pricing';

const GROCERY_SLUG = 'zakupy-spozywcze';

type CartRow = {
  product_id: string;
  quantity: number;
  note: string | null;
  products: { name: string; unit: string; estimated_price: number; is_active: boolean } | null;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Grocery module (seeded) — carries the fee config (rate/min or flat).
  const { data: moduleRow } = await supabase
    .from('modules')
    .select('id, base_price, price_unit, min_price, estimated_duration_min')
    .eq('slug', GROCERY_SLUG)
    .maybeSingle();
  const grocery = moduleRow as {
    id: string;
    base_price: number;
    price_unit: string;
    min_price: number | null;
    estimated_duration_min: number;
  } | null;
  if (!grocery) return NextResponse.json({ error: 'grocery_module_missing' }, { status: 503 });

  // Cart + product snapshot.
  const { data: cartRaw, error: cartErr } = await supabase
    .from('cart_items')
    .select('product_id, quantity, note, products(name, unit, estimated_price, is_active)')
    .eq('user_id', user.id);
  if (cartErr) {
    console.error('[checkout] cart fetch', cartErr);
    return NextResponse.json({ error: 'cart_lookup_failed' }, { status: 500 });
  }
  const cart = ((cartRaw as CartRow[] | null) ?? []).filter(
    (c) => c.products && c.products.is_active
  );
  if (cart.length === 0) return NextResponse.json({ error: 'cart_empty' }, { status: 400 });

  // Default address.
  const { data: addrRow } = await supabase
    .from('addresses')
    .select('id, estate_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();
  const address = addrRow as { id: string; estate_id: string | null } | null;
  if (!address || !address.estate_id) {
    return NextResponse.json({ error: 'no_default_address' }, { status: 409 });
  }

  // Basket value + service fee, in grosze (no float drift).
  const basketGr = cart.reduce(
    (sum, c) => sum + toGr(Number(c.products!.estimated_price)) * c.quantity,
    0
  );
  const feeGr =
    grocery.price_unit === 'percent'
      ? percentServiceFeeGr(
          basketGr,
          Number(grocery.base_price),
          toGr(Number(grocery.min_price ?? 0))
        )
      : toGr(Number(grocery.base_price));

  // Create the draft order. base_price = the fee actually charged (frozen).
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      resident_id: user.id,
      module_id: grocery.id,
      estate_id: address.estate_id,
      address_id: address.id,
      status: 'draft',
      base_price: feeGr / 100,
      total_price: (feeGr + basketGr) / 100,
      custom_data: {},
      estimated_duration_min: grocery.estimated_duration_min,
      created_via: 'tile'
    } as never)
    .select('id')
    .single();
  if (orderErr) {
    console.error('[checkout] order insert', orderErr);
    return NextResponse.json({ error: 'order_failed', message: orderErr.message }, { status: 500 });
  }
  const orderId = (orderRow as { id: string }).id;

  // Snapshot lines.
  const lines = cart.map((c) => ({
    order_id: orderId,
    product_id: c.product_id,
    name_snapshot: c.products!.name,
    unit: c.products!.unit,
    quantity: c.quantity,
    estimated_unit_price: c.products!.estimated_price,
    note: c.note
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(lines as never);
  if (itemsErr) {
    console.error('[checkout] items insert', itemsErr);
    // Roll back the orphan order (best effort).
    await supabase.from('orders').delete().eq('id', orderId);
    return NextResponse.json({ error: 'items_failed', message: itemsErr.message }, { status: 500 });
  }

  // Clear the cart.
  await supabase.from('cart_items').delete().eq('user_id', user.id);

  return NextResponse.json({ order_id: orderId }, { status: 201 });
}
