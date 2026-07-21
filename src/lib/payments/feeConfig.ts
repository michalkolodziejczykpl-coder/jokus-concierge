// fee_config accessor — the versioned revenue-split config (migration
// 20260721000001). Rows are append-only: the active row for an order type is
// the newest one with effective_from <= now. Callers must treat a null result
// as "config missing" and surface it — never silently invent a split.

import type { Database } from '@/lib/types/database';

export type FeeConfigRow = Database['public']['Tables']['fee_config']['Row'];
export type FeeConfigOrderType = 'consumer' | 'gastro';

// Structural client type: the server (@supabase/ssr) and admin (supabase-js)
// clients carry different SupabaseClient generic signatures in this dependency
// tree, so a nominal parameter type rejects one of them — and anything more
// precise than this trips TS2589 (excessively deep instantiation) when tsc
// compares it structurally against the real client. TECH DEBT (see CLAUDE.md):
// align the package versions, then restore SupabaseClient<Database>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (relation: any) => any };

/**
 * The fee_config row in force right now for the given order type, or null
 * when none exists (fresh environment before the migration seed).
 */
export async function getCurrentFeeConfig(
  client: SupabaseLike,
  orderType: FeeConfigOrderType
): Promise<FeeConfigRow | null> {
  const { data, error } = await client
    .from('fee_config')
    .select('*')
    .eq('order_type', orderType)
    .lte('effective_from', new Date().toISOString())
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[feeConfig] lookup failed', error);
    return null;
  }
  return data as FeeConfigRow | null;
}
