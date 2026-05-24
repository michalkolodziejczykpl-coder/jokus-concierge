// GET /api/slots/available?module_slug=...&address_id=...[&from=...&to=...]
//
// Returns available 1-slot windows for a given (module, resident address) pair,
// across all jokusors that serve the address. Delegates to the SECURITY DEFINER
// SQL function `get_available_slots`, which reads working_hours, vacation, and
// existing time_slots holds — see migration 20260524000004_slot_finder.sql.
//
// Address ownership is verified here in the route (the SQL function bypasses
// RLS by design, so a malicious client could otherwise probe other users' addresses).
//
// `from` / `to` default to [now, now + 7 days] in the SQL function. When passed,
// they should be ISO 8601 strings with timezone (e.g. '2026-05-25T08:00:00+02:00').

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  module_slug: z.string().min(1).max(100),
  address_id: z.string().uuid(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
});

type AvailableSlot = {
  jokusor_id: string;
  jokusor_name: string | null;
  slot_start: string;
  slot_end: string;
};

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // ---- Parse + validate query params --------------------------------------
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    module_slug: url.searchParams.get('module_slug'),
    address_id: url.searchParams.get('address_id'),
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // ---- Verify the address belongs to the requesting user ------------------
  // SQL function is SECURITY DEFINER and skips RLS, so we enforce ownership here.
  const { data: addr, error: addrErr } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', parsed.data.address_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (addrErr) {
    console.error('[GET /api/slots/available] address fetch', addrErr);
    return NextResponse.json({ error: 'address_lookup_failed' }, { status: 500 });
  }
  if (!addr) {
    return NextResponse.json({ error: 'address_not_found' }, { status: 404 });
  }

  // ---- Call the SQL slot-finder -------------------------------------------
  // Only include p_from / p_to when explicitly provided; otherwise Postgres
  // uses the function defaults (now, now + 7 days).
  const rpcArgs: Record<string, string> = {
    p_address_id: parsed.data.address_id,
    p_module_slug: parsed.data.module_slug
  };
  if (parsed.data.from) rpcArgs.p_from = parsed.data.from;
  if (parsed.data.to) rpcArgs.p_to = parsed.data.to;

  const { data, error: rpcErr } = await supabase.rpc(
    'get_available_slots' as never,
    rpcArgs as never
  );

  if (rpcErr) {
    console.error('[GET /api/slots/available] rpc', rpcErr);
    return NextResponse.json(
      { error: 'slot_lookup_failed', message: rpcErr.message },
      { status: 500 }
    );
  }

  const slots = (data as AvailableSlot[] | null) ?? [];

  return NextResponse.json({
    slots,
    count: slots.length
  });
}
