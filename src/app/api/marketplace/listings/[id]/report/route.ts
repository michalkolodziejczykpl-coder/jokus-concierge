// POST /api/marketplace/listings/[id]/report
// Calls report_listing (SECURITY DEFINER): dedupes per (listing, reporter),
// bumps reports_count, flips moderation_status to 'pending' at 3 reports.

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

  const { error } = await supabase.rpc('report_listing' as never, { p_listing_id: id } as never);

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('listing_not_found'))
      return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    if (msg.includes('cannot_report_own'))
      return NextResponse.json({ error: 'cannot_report_own' }, { status: 409 });
    if (msg.includes('already_reported'))
      return NextResponse.json({ error: 'already_reported' }, { status: 409 });
    console.error('[POST /api/marketplace/listings/[id]/report] rpc', error);
    return NextResponse.json({ error: 'report_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
