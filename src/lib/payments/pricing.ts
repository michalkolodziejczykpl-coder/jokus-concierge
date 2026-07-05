// Service pricing + revenue split — single source of truth for the shop
// checkout (what the resident pays) and the earnings panel (jokusor's share).
//
// Model (owner-confirmed 2026-07-05, v2):
//   * Fixed-price modules: price = modules.base_price (admin-editable).
//   * Percent-priced modules (price_unit='percent', e.g. grocery): price =
//     max(modules.min_price, modules.base_price% × basket value). The computed
//     fee is PERSISTED into orders.base_price at checkout — earnings always
//     read that frozen value, so later admin changes to the % / minimum never
//     rewrite closed months.
//   * The jokusor earns payout_share (default 50%) of the service price; tips
//     are 100% theirs; subscription (default 0) is a monthly cost.
//
// All math in grosze (integers). Rounding: each step rounds to a whole grosz
// via Math.round — a half-grosz rounds UP (for the share: in the jokusor's
// favour).

export const toGr = (zl: number) => Math.round(zl * 100);

/**
 * Service fee for percent-priced modules: max(minimum, pct% of the basket).
 *   percentServiceFeeGr(5000gr, 5, 1000gr) → 1000gr  (5% of 50 zł < 10 zł min)
 *   percentServiceFeeGr(40000gr, 5, 1000gr) → 2000gr (5% of 400 zł)
 */
export function percentServiceFeeGr(basketGr: number, pctRate: number, minGr: number): number {
  return Math.max(minGr, Math.round((basketGr * pctRate) / 100));
}

/**
 * Jokusor's share of a service fee (e.g. 0.5 → 50%), rounded to a whole
 * grosz, half up.
 */
export function jokusorShareGr(feeGr: number, share: number): number {
  return Math.round(feeGr * share);
}
