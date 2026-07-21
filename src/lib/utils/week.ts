// Date-only week helpers (Mon–Sun) for the gastro weekly statement.
// All inputs/outputs are YYYY-MM-DD strings; computed in UTC at noon so DST
// shifts can never move a date across midnight.

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the week containing the given date. */
export function mondayOf(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
