// POST /api/orders/draft
//
// Creates an order row with `status = 'draft'`. The client only sends the
// module + form data — the server fills in everything price/identity-related
// from the session and the module row (so a malicious client can't underpay
// or order for someone else).
//
// Stage 1: `total_price = base_price` always. Stage 2 (slot picker + per-km
// modules) will multiply by distance, jokusor surcharge, etc.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orderDraftInputSchema, customFieldsToZodSchema } from '@/lib/utils/validators';
import type { Module } from '@/lib/types/modules';
import type { Address } from '@/lib/types/addresses';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // ---- Parse + validate envelope ------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = orderDraftInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // ---- Load the module to get pricing + custom_fields shape ---------------
  const { data: moduleRow, error: moduleErr } = await supabase
    .from('modules')
    .select('*')
    .eq('id', parsed.data.module_id)
    .maybeSingle();

  if (moduleErr) {
    console.error('[POST /api/orders/draft] module fetch', moduleErr);
    return NextResponse.json({ error: 'module_lookup_failed' }, { status: 500 });
  }
  if (!moduleRow) {
    return NextResponse.json({ error: 'module_not_found' }, { status: 404 });
  }

  const moduleData = moduleRow as unknown as Module;

  // ---- Validate custom_data against the module's declared shape -----------
  // The client schema already ran on the form, but a malicious client could
  // skip it — so we re-validate server-side against the same source of truth
  // (the `custom_fields` jsonb column).
  const customSchema = customFieldsToZodSchema(moduleData.custom_fields);
  const customParsed = customSchema.safeParse(parsed.data.custom_data);
  if (!customParsed.success) {
    return NextResponse.json(
      { error: 'custom_data_invalid', issues: customParsed.error.flatten() },
      { status: 422 }
    );
  }

  // ---- Resolve resident's default address ---------------------------------
  const { data: addressRow, error: addrErr } = await supabase
    .from('addresses')
    .select('*')
    .eq('is_default', true)
    .maybeSingle();

  if (addrErr) {
    console.error('[POST /api/orders/draft] address fetch', addrErr);
    return NextResponse.json({ error: 'address_lookup_failed' }, { status: 500 });
  }
  if (!addressRow) {
    // Onboarding gate should have prevented this; still — defensive.
    return NextResponse.json({ error: 'no_default_address' }, { status: 409 });
  }

  const address = addressRow as unknown as Address;

  if (!address.estate_id) {
    return NextResponse.json({ error: 'address_missing_estate' }, { status: 409 });
  }

  // ---- Insert the draft ---------------------------------------------------
  const payload = {
    resident_id: user.id,
    module_id: moduleData.id,
    estate_id: address.estate_id,
    address_id: address.id,
    status: 'draft' as const,
    base_price: moduleData.base_price,
    total_price: moduleData.base_price,
    custom_data: customParsed.data,
    notes: parsed.data.notes || null,
    estimated_duration_min: moduleData.estimated_duration_min,
    created_via: 'tile'
  };

  // Cast: same reason as in /api/onboarding/address — generic Database stub
  // collapses supabase-js insert overload to `never`. Runtime unchanged.
  const { data: inserted, error: insertErr } = await supabase
    .from('orders')
    .insert(payload as never)
    .select('id')
    .single();

  if (insertErr) {
    console.error('[POST /api/orders/draft] insert', insertErr);
    return NextResponse.json(
      { error: 'insert_failed', message: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: (inserted as { id: string }).id }, { status: 201 });
}
