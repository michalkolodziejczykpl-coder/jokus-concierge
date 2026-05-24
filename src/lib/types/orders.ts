// Hand-written types for `public.orders` (subset for Phase 1).
// Mirrors `supabase/migrations/20260516000001_initial_schema.sql:231-262`.
//
// Only the columns we read or write in the resident draft path are typed here.
// Add fields as later sprints touch them (slot picker, payment, tracking).

import type { OrderStatus } from './orderStatus';

export type Order = {
  id: string;
  resident_id: string;
  jokusor_id: string | null;
  module_id: string;
  estate_id: string;
  address_id: string;
  pickup_address: Record<string, unknown> | null;
  status: OrderStatus;
  base_price: number;
  total_price: number;
  custom_data: Record<string, unknown>;
  notes: string | null;
  bodycam_enabled: boolean | null;
  scheduled_at: string | null;
  estimated_duration_min: number | null;
  created_via: string | null;
  created_at: string;
};

/**
 * Body of `POST /api/orders/draft`. `resident_id`, `estate_id`, `address_id`,
 * `base_price`, and `total_price` are filled in server-side from the session +
 * the module row — the client never sends them.
 */
export type OrderDraftInput = {
  module_id: string;
  custom_data: Record<string, string | number>;
  notes?: string;
};
