// Cross-cutting constants. Keep small — module-specific values belong in their own files.

export const APP_NAME = 'MIGMIG Concierge';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const SLOT_HOLD_TTL_SECONDS = 90;
export const TRACKING_BROADCAST_INTERVAL_MS = 7_000;
export const AI_INTENT_CONFIDENCE_THRESHOLD = 0.75;
