// Cross-cutting constants. Keep small — module-specific values belong in their own files.

export const APP_NAME = 'MIGMIG Concierge';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Company / operator data. Single source of truth for footer, legal pages and invoices.
export const COMPANY = {
  legalName: 'JOKUS Sp. z o.o.',
  brandName: 'MIGMIG Concierge',
  nip: '9131639730',
  city: 'Wrocław',
  // TODO: uzupełnić pełny adres rejestrowy + KRS + REGON przed publicznym launchem.
  addressLine: 'Wrocław',
  email: 'michal.kolodziejczyk.pl@gmail.com',
  paymentProvider: 'Przelewy24 (PayPro S.A.)',
  marketplaceCommissionPct: 5,
  inspectionWindowMinutes: 15
} as const;

export const SLOT_HOLD_TTL_SECONDS = 90;
export const TRACKING_BROADCAST_INTERVAL_MS = 7_000;
export const AI_INTENT_CONFIDENCE_THRESHOLD = 0.75;
