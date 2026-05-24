// Hand-written types for the `modules` table and related domain objects.
// Mirrors `supabase/migrations/20260516000001_initial_schema.sql:183-200`.
//
// TEMPORARY: replace with generated types from `supabase gen types typescript`
// once the Supabase CLI is set up (REVIEW_REPORT.md #5). Until then, any
// hand-edit to the SQL `modules` table must be mirrored here.

/**
 * Service module categories, in display order on the resident home.
 * Mirrors enum `module_category` in SQL.
 */
export type ModuleCategory =
  | 'delivery'
  | 'shopping'
  | 'transport'
  | 'home_pet'
  | 'errands'
  | 'professional'
  | 'marketplace';

/**
 * How `base_price` should be interpreted.
 * - `fixed`   — single flat fee
 * - `hourly`  — fee per started hour
 * - `per_km`  — fee per kilometre (transport)
 * - `percent` — percent of basket value (marketplace commission)
 *
 * Mirrors enum `price_unit` in SQL.
 */
export type PriceUnit = 'fixed' | 'hourly' | 'per_km' | 'percent';

/**
 * A single dynamic form field declared in `modules.custom_fields` (jsonb).
 * Drives the order-form UI for each module (Phase 1 next sprint will render it).
 */
export type CustomField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'photo';
  required: boolean;
  /** Present only when `type === 'select'`. */
  options?: string[];
};

/**
 * A row from `public.modules`. Field names match SQL columns 1:1
 * (snake_case) so Supabase responses can be assigned without remapping.
 */
export type Module = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: ModuleCategory;
  /** Lucide icon name, e.g. 'Package'. Renderer maps string → component. */
  icon_name: string | null;
  /** Stored as numeric(10,2) in SQL — Supabase returns it as a number. */
  base_price: number;
  price_unit: PriceUnit;
  estimated_duration_min: number;
  requires_pickup: boolean;
  requires_age_verification: boolean;
  custom_fields: CustomField[];
  is_global: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * Display order of categories on the resident home screen.
 * Used as the canonical iteration order in `ModuleGrid`.
 */
export const MODULE_CATEGORY_ORDER: readonly ModuleCategory[] = [
  'delivery',
  'shopping',
  'transport',
  'home_pet',
  'errands',
  'professional',
  'marketplace'
] as const;

/**
 * Polish labels for category section headers.
 */
export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  delivery: 'Dostawy',
  shopping: 'Zakupy',
  transport: 'Transport',
  home_pet: 'Dom i zwierzęta',
  errands: 'Sprawy urzędowe',
  professional: 'Przypilnuj fachowca',
  marketplace: 'Marketplace'
};
