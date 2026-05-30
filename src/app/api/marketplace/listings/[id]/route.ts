// PATCH  /api/marketplace/listings/[id]  — edit own listing (RLS listings_update_own).
// DELETE /api/marketplace/listings/[id]  — soft-delete own listing (status='removed').
//   Soft delete avoids FK issues with marketplace_purchases and preserves history.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateListingSchema } from '@/lib/utils/validators';

type RouteContext = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (patch.description === '') patch.description = null;

  // RLS (listings_update_own) guarantees only the owner's row is touched; we
  // also scope by seller_id for clarity and defence in depth.
  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(patch as never)
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[PATCH /api/marketplace/listings/[id]] update', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 200 });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update({ status: 'removed', updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[DELETE /api/marketplace/listings/[id]] soft-delete', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
