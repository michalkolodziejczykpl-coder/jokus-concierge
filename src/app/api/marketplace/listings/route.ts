// POST /api/marketplace/listings
//
// Creates a marketplace listing. seller_id + estate_id are filled server-side
// from the session (seller is whoever's logged in; estate is taken from their
// default address). Photos / categories / moderation queue come in later
// sprints — this is the minimum: text + price + pickup address.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createListingSchema } from '@/lib/utils/validators';

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

  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Seller's estate comes from their default address; we trust the postal
  // code on the pickup_address but the estate scoping uses the address row.
  const { data: addrRow, error: addrErr } = await supabase
    .from('addresses')
    .select('estate_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  if (addrErr) {
    console.error('[POST /api/marketplace/listings] address fetch', addrErr);
    return NextResponse.json({ error: 'address_lookup_failed' }, { status: 500 });
  }
  const estateId = (addrRow as { estate_id?: string } | null)?.estate_id ?? null;
  if (!estateId) {
    return NextResponse.json({ error: 'no_default_address' }, { status: 409 });
  }

  const payload = {
    seller_id: user.id,
    estate_id: estateId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category,
    price: parsed.data.price,
    currency: 'PLN',
    condition: parsed.data.condition,
    status: 'active' as const,
    photos: parsed.data.photos,
    pickup_address: parsed.data.pickup_address,
    delivery_option: parsed.data.delivery_option
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('marketplace_listings')
    .insert(payload as never)
    .select('id')
    .single();

  if (insertErr) {
    console.error('[POST /api/marketplace/listings] insert', insertErr);
    return NextResponse.json(
      { error: 'insert_failed', message: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: (inserted as { id: string }).id }, { status: 201 });
}
