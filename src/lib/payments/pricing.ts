// Service pricing + revenue split — single source of truth for the shop
// checkout (what the resident pays), the gastro course log (what the
// restaurant pays) and the earnings panel (jokusor's share).
//
// Model (owner-confirmed 2026-07-21, v3):
//   * Fixed-price modules: price = modules.base_price (admin-editable).
//   * Percent-priced modules (price_unit='percent', e.g. grocery): price =
//     max(modules.min_price, modules.base_price% × basket value).
//   * Gastro courses: net base fee up to N included km, + per-km fee for each
//     further started km. Parameters live in fee_config('gastro').
//   * SPLIT: the general rule lives in fee_config.jokusor_share (versioned,
//     append-only); jokusors.payout_share is an optional per-jokusor
//     exception. No numeric split constants belong in this file — both inputs
//     always come from the database.
//   * FREEZING: the computed price AND the effective share are persisted on
//     the order row at transaction time (orders.base_price +
//     *_frozen columns; gastro_orders.fee + jokusor_share_frozen).
//     Settlements read only those frozen values, so later admin changes never
//     rewrite closed months. Tips are 100% the jokusor's.
//
// All math in grosze (integers). Rounding: each step rounds to a whole grosz
// via Math.round — a half-grosz rounds UP (for the share: in the jokusor's
// favour). Fee rounding (partial km, percent fees) rounds in the platform's
// favour.

export const toGr = (zl: number) => Math.round(zl * 100);

/**
 * Service fee for percent-priced modules: max(minimum, pct% of the basket).
 *   percentServiceFeeGr(5000gr, 5, 1490gr) → 1490gr  (5% of 50 zł < minimum)
 *   percentServiceFeeGr(40000gr, 5, 1490gr) → 2000gr (5% of 400 zł)
 */
export function percentServiceFeeGr(basketGr: number, pctRate: number, minGr: number): number {
  return Math.max(minGr, Math.round((basketGr * pctRate) / 100));
}

/**
 * Net gastro course fee charged to the restaurant: the base fee covers the
 * first `includedKm`; every further STARTED kilometre adds `perKmGr`
 * (rounding up — in the platform's favour).
 *   gastroFeeGr(4, 1999gr, 5, 250gr) → 1999gr
 *   gastroFeeGr(8, 1999gr, 5, 250gr) → 2749gr
 */
export function gastroFeeGr(
  distanceKm: number,
  baseGr: number,
  includedKm: number,
  perKmGr: number
): number {
  const extraKm = Math.max(0, Math.ceil(distanceKm - includedKm));
  return baseGr + extraKm * perKmGr;
}

/**
 * Effective jokusor share as a 0–1 fraction: the per-jokusor exception if
 * set, else the general fee_config rule. Deliberately no numeric fallback —
 * the rule must come from the database.
 */
export function effectiveShare(
  payoutShare: number | null | undefined,
  configShare: number
): number {
  return payoutShare ?? configShare;
}

/**
 * Jokusor's share of a service fee (e.g. 0.8 → 80%), rounded to a whole
 * grosz, half up.
 */
export function jokusorShareGr(feeGr: number, share: number): number {
  return Math.round(feeGr * share);
}
