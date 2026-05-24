// Hand-written types for `public.addresses`.
// Mirrors `supabase/migrations/20260516000001_initial_schema.sql:108-122`.

export type Address = {
  id: string;
  user_id: string;
  label: string;
  street: string;
  building: string;
  apartment: string | null;
  city: string;
  postal_code: string;
  /** PostGIS POINT, Supabase returns as string. */
  point: string | null;
  estate_id: string | null;
  is_default: boolean;
  notes: string | null;
  created_at: string;
};

/**
 * Fields the resident fills in onboarding. `user_id` is taken from the
 * session server-side; `point` is geocoded later (Stage 2).
 */
export type AddressInput = {
  estate_id: string;
  street: string;
  building: string;
  apartment?: string;
  postal_code: string;
  city: string;
  label?: string;
  notes?: string;
};
