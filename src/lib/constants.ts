// Cross-cutting constants. Keep small — module-specific values belong in their own files.

export const APP_NAME = 'JOKUS Concierge';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Company / operator data — single source of truth for footer, legal pages, invoices.
// Registry data per KRS (odpis z 09.11.2024).
export const COMPANY = {
  legalName: 'JOKUS Sp. z o.o.',
  legalNameFull: 'JOKUS Spółka z ograniczoną odpowiedzialnością',
  brandName: 'JOKUS Concierge',
  nip: '9131639730',
  krs: '0001128971',
  regon: '529737219',
  street: 'ul. Kwiatowa 8',
  postalCode: '55-330',
  city: 'Księginice',
  addressLine: 'ul. Kwiatowa 8, 55-330 Księginice',
  registryCourt:
    'Sąd Rejonowy dla Wrocławia-Fabrycznej we Wrocławiu, IX Wydział Gospodarczy Krajowego Rejestru Sądowego',
  shareCapitalPln: '5 000,00 zł',
  email: 'biuro@jokus.pl',
  // Address for consumer returns / withdrawal statements.
  returnAddress: 'JOKUS Sp. z o.o., ul. Kwiatowa 8, 55-330 Księginice',
  paymentProvider: 'Przelewy24 (PayPro S.A.)',
  marketplaceCommissionPct: 5,
  inspectionWindowMinutes: 15
} as const;

export const SLOT_HOLD_TTL_SECONDS = 90;
export const TRACKING_BROADCAST_INTERVAL_MS = 7_000;
export const AI_INTENT_CONFIDENCE_THRESHOLD = 0.75;
