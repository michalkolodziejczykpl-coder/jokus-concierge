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
