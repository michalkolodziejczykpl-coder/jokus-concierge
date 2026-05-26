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

// All date formatters pin to Europe/Warsaw so SSR (server, UTC) and CSR
// (browser, user-local) match. The user's experience is Polish-local;
// other timezones would only be a thing once we open to non-PL markets.
const PL_TZ = 'Europe/Warsaw';

const DAY_HEADER_FMT = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: PL_TZ
});

const TIME_FMT = new Intl.DateTimeFormat('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PL_TZ
});

const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: PL_TZ
});

/**
 * Day header for slot grid: "poniedziałek, 25 maja".
 */
export function formatDayHeader(iso: string): string {
  return DAY_HEADER_FMT.format(new Date(iso));
}

/**
 * "08:00" — hour and minute in Warsaw time.
 */
export function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

/**
 * "08:00 – 08:20" — slot start/end pair.
 */
export function formatSlotRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/**
 * Stable day key for grouping slots (YYYY-MM-DD in Warsaw TZ).
 * Use as a Map key when bucketing slots by day.
 */
export function dayKey(iso: string): string {
  return DAY_KEY_FMT.format(new Date(iso));
}

/**
 * Countdown rendered as "m:ss" (e.g. "1:23"). Negative values clamp to "0:00".
 */
export function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
