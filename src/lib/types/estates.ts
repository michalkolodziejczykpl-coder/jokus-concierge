// Hand-written types for `public.estates`.
// Mirrors `supabase/migrations/20260516000001_initial_schema.sql:92-102`.

export type Estate = {
  id: string;
  name: string;
  city: string;
  voivodeship: string;
  /** GeoJSON-ish polygon — Supabase serialises geography as string by default. */
  boundary: string | null;
  postal_codes: string[] | null;
  is_active: boolean;
  launched_at: string | null;
  created_at: string;
};
