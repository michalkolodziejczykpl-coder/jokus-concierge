// POST /api/marketplace/messages — send a message about a listing.
// sender_id is the session user (RLS msgs_insert enforces sender_id = auth.uid()).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { marketplaceMessageSchema } from '@/lib/utils/validators';

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

  const parsed = marketplaceMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  if (parsed.data.recipient_id === user.id) {
    return NextResponse.json({ error: 'cannot_message_self' }, { status: 400 });
  }

  // Without this check, any logged-in user could DM any other user under the
  // guise of "asking about a listing". The two legitimate cases are:
  //   (a) anyone (buyer) writes to the listing's seller; or
  //   (b) the seller replies to someone who already messaged them on this listing.
  const { data: listingRow, error: lErr } = await supabase
    .from('marketplace_listings')
    .select('seller_id, status')
    .eq('id', parsed.data.listing_id)
    .maybeSingle();
  if (lErr) {
    console.error('[POST /api/marketplace/messages] listing lookup', lErr);
    return NextResponse.json({ error: 'listing_lookup_failed' }, { status: 500 });
  }
  const listing = listingRow as { seller_id: string; status: string } | null;
  if (!listing) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  }

  const senderIsSeller = listing.seller_id === user.id;
  const recipientIsSeller = listing.seller_id === parsed.data.recipient_id;

  if (!senderIsSeller && !recipientIsSeller) {
    return NextResponse.json({ error: 'invalid_recipient' }, { status: 403 });
  }

  if (senderIsSeller) {
    // Seller may only reply to someone who has already written to them about
    // this listing — prevents the seller from cold-DM-ing arbitrary buyers.
    const { data: priorRow, error: pErr } = await supabase
      .from('marketplace_messages')
      .select('id')
      .eq('listing_id', parsed.data.listing_id)
      .eq('sender_id', parsed.data.recipient_id)
      .eq('recipient_id', user.id)
      .limit(1)
      .maybeSingle();
    if (pErr) {
      console.error('[POST /api/marketplace/messages] prior lookup', pErr);
      return NextResponse.json({ error: 'prior_lookup_failed' }, { status: 500 });
    }
    if (!priorRow) {
      return NextResponse.json({ error: 'no_prior_thread' }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from('marketplace_messages')
    .insert({
      listing_id: parsed.data.listing_id,
      sender_id: user.id,
      recipient_id: parsed.data.recipient_id,
      content: parsed.data.content
    } as never)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[POST /api/marketplace/messages] insert', error);
    return NextResponse.json({ error: 'send_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
