// PATCH /api/admin/jokusors/[userId]/billing — admin edits a jokusor's
// billing (v2): payout share (% of each order's service price, default 50%)
// and monthly subscription (default 0). Service-role client like the sibling
// approve/reject routes (admin-only mutations on jokusors). Caller must be an
// admin.
//
// Requires migration 20260706000001_jokusor_billing_fields.sql to be applied
// (payout_share column) — until then the update fails with a readable column
// error.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { jokusorBillingSchema } from '@/lib/utils/validators';

type RouteContext = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = jokusorBillingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  // Store percent as the 0–1 fraction payout_share expects (numeric(5,4)).
  const share = Math.round(parsed.data.payout_share_percent * 100) / 10_000;

  const { data, error } = await admin
    .from('jokusors')
    .update({
      payout_share: share,
      subscription_amount: parsed.data.subscription_amount,
      updated_at: new Date().toISOString()
    } as never)
    .eq('user_id', userId)
    .select('user_id');

  if (error) {
    console.error('[PATCH /api/admin/jokusors/[userId]/billing] update', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'jokusor_not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
