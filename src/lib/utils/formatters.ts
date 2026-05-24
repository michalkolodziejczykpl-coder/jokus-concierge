// Display formatters for Polish locale.
// All UI-visible numbers and dates must go through here so we stay consistent
// (and so a future locale switch is a single change).

const PLN_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Format a złoty amount for display.
 *   formatPLN(15) → "15,00 zł"
 *   formatPLN(8.5) → "8,50 zł"
 */
export function formatPLN(amount: number): string {
  return PLN_FORMATTER.format(amount);
}

/**
 * Compact human-readable duration.
 *   formatDurationMin(20)  → "20 min"
 *   formatDurationMin(60)  → "1 h"
 *   formatDurationMin(90)  → "1 h 30 min"
 *   formatDurationMin(120) → "2 h"
 */
export function formatDurationMin(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
