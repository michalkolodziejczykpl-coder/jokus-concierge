// POST /api/admin/gastro/courses — log one delivered gastro course.
//
// The fee is computed HERE (never taken from the client) from the current
// fee_config('gastro') parameters and FROZEN on the row together with the
// jokusor's effective share (exception ?? general rule) and the config id —
// later config rows never reprice logged courses. Admin-only.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { gastroCourseSchema } from '@/lib/utils/validators';
import { getCurrentFeeConfig } from '@/lib/payments/feeConfig';
import { toGr, gastroFeeGr, effectiveShare } from '@/lib/payments/pricing';

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = gastroCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  const admin = createAdminClient();

  const cfg = await getCurrentFeeConfig(admin, 'gastro');
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, is_active')
    .eq('id', d.restaurant_id)
    .maybeSingle();
  const { data: jokusor } = await admin
    .from('jokusors')
    .select('user_id, payout_share')
    .eq('user_id', d.jokusor_id)
    .maybeSingle();

  if (!cfg) return NextResponse.json({ error: 'fee_config_missing' }, { status: 503 });
  if (
    cfg.gastro_base_fee == null ||
    cfg.gastro_included_km == null ||
    cfg.gastro_per_km_fee == null
  ) {
    console.error(
      '[POST /api/admin/gastro/courses] gastro fee_config row lacks parameters',
      cfg.id
    );
    return NextResponse.json({ error: 'fee_config_invalid' }, { status: 500 });
  }
  if (!restaurant) return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
  if (!restaurant.is_active) {
    return NextResponse.json({ error: 'restaurant_inactive' }, { status: 409 });
  }
  if (!jokusor) return NextResponse.json({ error: 'jokusor_not_found' }, { status: 404 });

  const feeGr = gastroFeeGr(
    d.distance_km,
    toGr(cfg.gastro_base_fee),
    cfg.gastro_included_km,
    toGr(cfg.gastro_per_km_fee)
  );
  const share = effectiveShare(jokusor.payout_share, cfg.jokusor_share);

  const { data, error } = await admin
    .from('gastro_orders')
    .insert({
      restaurant_id: d.restaurant_id,
      jokusor_id: d.jokusor_id,
      delivered_on: d.delivered_on,
      distance_km: d.distance_km,
      fee: feeGr / 100,
      jokusor_share_frozen: share,
      fee_config_id: cfg.id,
      notes: d.notes || null
    })
    .select('id, fee')
    .single();

  if (error) {
    console.error('[POST /api/admin/gastro/courses] insert', error);
    return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, fee: data.fee }, { status: 201 });
}
