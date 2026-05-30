// Shared Zod schemas + schema builders for resident-facing inputs.
//
// All API route handlers MUST validate request bodies through schemas defined
// here, so the client and the server share the exact same shape of truth.
// Client-side forms can also use these schemas to provide live feedback.

import { z } from 'zod';
import type { CustomField } from '@/lib/types/modules';

// ============================================================================
// Onboarding — address input
// ============================================================================

/**
 * Polish postal code: NN-NNN. Strict — front-end mask should enforce the dash.
 */
const postalCodeSchema = z.string().regex(/^\d{2}-\d{3}$/, 'Kod pocztowy w formacie 00-000');

/**
 * Resident-supplied address. `user_id` is filled server-side from the session.
 */
export const addressInputSchema = z.object({
  estate_id: z.string().uuid('Wybierz osiedle'),
  street: z.string().trim().min(2, 'Podaj nazwę ulicy').max(120),
  building: z.string().trim().min(1, 'Numer budynku').max(20),
  apartment: z.string().trim().max(20).optional().or(z.literal('')),
  postal_code: postalCodeSchema,
  city: z.string().trim().min(2).max(80).default('Wrocław'),
  label: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal(''))
});

export type AddressInputParsed = z.infer<typeof addressInputSchema>;

// ============================================================================
// Order draft — body of POST /api/orders/draft
// ============================================================================

export const orderDraftInputSchema = z.object({
  module_id: z.string().uuid(),
  custom_data: z.record(z.union([z.string(), z.number()])),
  notes: z.string().trim().max(500).optional().or(z.literal(''))
});

export type OrderDraftInputParsed = z.infer<typeof orderDraftInputSchema>;

// ============================================================================
// Marketplace — listing creation
// ============================================================================

const pickupAddressSchema = z.object({
  street: z.string().trim().min(2).max(120),
  building: z.string().trim().min(1).max(20),
  apartment: z.string().trim().max(20).nullable().optional(),
  city: z.string().trim().min(2).max(80).default('Wrocław'),
  postal_code: postalCodeSchema
});

export const createListingSchema = z.object({
  title: z.string().trim().min(3, 'Tytuł min 3 znaki').max(100),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'kids', 'sports', 'other']),
  price: z.coerce
    .number({ invalid_type_error: 'Cena musi być liczbą' })
    .min(5, 'Minimalna cena 5 zł')
    .max(50_000, 'Maksymalna cena 50 000 zł'),
  condition: z.enum(['new', 'like_new', 'good', 'used', 'for_parts']),
  delivery_option: z
    .enum(['migmig_only', 'pickup_only', 'migmig_or_pickup'])
    .default('migmig_or_pickup'),
  pickup_address: pickupAddressSchema,
  photos: z.array(z.string().url()).max(3, 'Maksymalnie 3 zdjęcia').default([])
});

export type CreateListingParsed = z.infer<typeof createListingSchema>;

// ============================================================================
// Dynamic schema builder: CustomField[] → Zod object
// ============================================================================

/**
 * Build a Zod schema that validates a module's `custom_data` payload based on
 * the `custom_fields` declaration stored in the module row.
 *
 * - text   → trimmed string, min 1 if required
 * - number → coerced number (forms send strings)
 * - select → enum of allowed options
 * - photo  → string URL (Stage 1 placeholder — real upload comes later)
 *
 * Optional fields accept `""` so an empty input passes through without a
 * "required" error.
 */
export function customFieldsToZodSchema(fields: CustomField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let base: z.ZodTypeAny;

    switch (field.type) {
      case 'number':
        base = field.required
          ? z.coerce.number({ invalid_type_error: `${field.label} musi być liczbą` })
          : z.union([z.coerce.number(), z.literal('')]).optional();
        break;

      case 'select': {
        const options = field.options ?? [];
        if (options.length === 0) {
          // Defensive: shouldn't happen if DB seed is correct, but don't crash.
          base = z.string();
        } else {
          base = z.enum(options as [string, ...string[]], {
            errorMap: () => ({ message: `Wybierz: ${field.label}` })
          });
        }
        if (!field.required) base = base.optional().or(z.literal(''));
        break;
      }

      case 'photo':
        // Placeholder: accept any non-empty string for now (Stage 2 will
        // validate against Supabase Storage public URL).
        base = field.required
          ? z.string().trim().min(1, `Dodaj: ${field.label}`)
          : z.string().trim().optional().or(z.literal(''));
        break;

      case 'text':
      default:
        base = field.required
          ? z.string().trim().min(1, `Wypełnij: ${field.label}`)
          : z.string().trim().optional().or(z.literal(''));
        break;
    }

    shape[field.key] = base;
  }

  return z.object(shape);
}

// ============================================================================
// Marketplace — listing edit (partial). Photos are edited separately.
// ============================================================================

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(3, 'Tytuł min 3 znaki').max(100).optional(),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    category: z
      .enum(['electronics', 'clothing', 'books', 'home', 'kids', 'sports', 'other'])
      .optional(),
    price: z.coerce
      .number({ invalid_type_error: 'Cena musi być liczbą' })
      .min(5, 'Minimalna cena 5 zł')
      .max(50_000, 'Maksymalna cena 50 000 zł')
      .optional(),
    condition: z.enum(['new', 'like_new', 'good', 'used', 'for_parts']).optional(),
    delivery_option: z.enum(['migmig_only', 'pickup_only', 'migmig_or_pickup']).optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Brak zmian do zapisania' });

export type UpdateListingParsed = z.infer<typeof updateListingSchema>;

// ============================================================================
// Marketplace — buyer/seller message
// ============================================================================

export const marketplaceMessageSchema = z.object({
  listing_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  content: z.string().trim().min(1, 'Wpisz treść wiadomości').max(2000, 'Maksymalnie 2000 znaków')
});

export type MarketplaceMessageParsed = z.infer<typeof marketplaceMessageSchema>;

// ============================================================================
// Jokusor onboarding — self-application
// ============================================================================

export const jokusorApplicationSchema = z.object({
  estate_id: z.string().uuid('Wybierz osiedle'),
  service_postal_codes: z
    .array(z.string().regex(/^\d{2}-\d{3}$/, 'Kod w formacie 00-000'))
    .min(1, 'Podaj co najmniej jeden kod pocztowy')
    .max(50, 'Maksymalnie 50 kodów'),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
  business_name: z.string().trim().max(160).optional().or(z.literal('')),
  nip: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NIP to 10 cyfr')
    .optional()
    .or(z.literal('')),
  bank_account: z.string().trim().max(40).optional().or(z.literal('')),
  // Storage object PATHS (private bucket), not public URLs.
  background_check_url: z.string().trim().min(1, 'Wymagane zaświadczenie o niekaralności'),
  insurance_doc_url: z.string().trim().optional().or(z.literal(''))
});

export type JokusorApplicationParsed = z.infer<typeof jokusorApplicationSchema>;

// ============================================================================
// Profile editing — resident + jokusor
// ============================================================================

export const residentProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Podaj imię i nazwisko').max(120),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  address: addressInputSchema
});

export type ResidentProfileParsed = z.infer<typeof residentProfileSchema>;

export const jokusorProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Podaj imię i nazwisko').max(120),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
  service_postal_codes: z
    .array(z.string().regex(/^\d{2}-\d{3}$/, 'Kod w formacie 00-000'))
    .min(1, 'Podaj co najmniej jeden kod pocztowy')
    .max(50),
  business_name: z.string().trim().max(160).optional().or(z.literal('')),
  nip: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'NIP to 10 cyfr')
    .optional()
    .or(z.literal('')),
  bank_account: z.string().trim().max(40).optional().or(z.literal('')),
  public_photo_url: z.string().trim().url().optional().or(z.literal(''))
});

export type JokusorProfileParsed = z.infer<typeof jokusorProfileSchema>;

// ============================================================================
// Ratings + tips (after a completed order)
// ============================================================================

export const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1, 'Wybierz ocenę').max(5),
  comment: z.string().trim().max(500).optional().or(z.literal(''))
});

export type RatingParsed = z.infer<typeof ratingSchema>;

export const tipSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Kwota musi być liczbą' })
    .positive('Kwota musi być dodatnia')
    .min(1, 'Minimalny napiwek 1 zł')
    .max(1000, 'Maksymalny napiwek 1000 zł')
});

export type TipParsed = z.infer<typeof tipSchema>;

// ============================================================================
// Order chat message
// ============================================================================

export const orderMessageSchema = z.object({
  content: z.string().trim().min(1, 'Wpisz treść').max(2000, 'Maksymalnie 2000 znaków')
});

export type OrderMessageParsed = z.infer<typeof orderMessageSchema>;

// ============================================================================
// Admin — modules, estates, per-estate activation
// ============================================================================

export const moduleSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Slug: małe litery, cyfry i myślniki')
    .min(2)
    .max(60),
  name: z.string().trim().min(2, 'Podaj nazwę').max(80),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  category: z.enum([
    'delivery',
    'shopping',
    'transport',
    'home_pet',
    'errands',
    'professional',
    'marketplace'
  ]),
  icon_name: z.string().trim().max(40).optional().or(z.literal('')),
  base_price: z.coerce.number({ invalid_type_error: 'Cena musi być liczbą' }).min(0).max(100_000),
  price_unit: z.enum(['fixed', 'hourly', 'per_km', 'percent']),
  estimated_duration_min: z.coerce.number().int().min(1, 'Min 1 min').max(1440),
  requires_pickup: z.boolean(),
  requires_age_verification: z.boolean(),
  is_global: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999)
});
export type ModuleParsed = z.infer<typeof moduleSchema>;

export const estateSchema = z.object({
  name: z.string().trim().min(2, 'Podaj nazwę').max(80),
  city: z.string().trim().min(2, 'Podaj miasto').max(80),
  voivodeship: z.string().trim().max(80).optional().or(z.literal('')),
  postal_codes: z
    .array(z.string().regex(/^\d{2}-\d{3}$/, 'Kod w formacie 00-000'))
    .min(1, 'Podaj co najmniej jeden kod pocztowy')
    .max(200),
  is_active: z.boolean()
});
export type EstateParsed = z.infer<typeof estateSchema>;

export const moduleActivationSchema = z.object({
  module_id: z.string().uuid(),
  active: z.boolean(),
  price_override: z.coerce.number().min(0).max(100_000).nullable().optional()
});
export type ModuleActivationParsed = z.infer<typeof moduleActivationSchema>;
