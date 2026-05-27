// Geo helpers for sprint 5 live tracking — distance + ETA + freshness.
// No external map dep; pure math.

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_AVG_SPEED_KMH = 25; // city scooter / brisk delivery pace

export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * Haversine distance between two points in METRES.
 */
export function haversineDistanceM(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance label like "1,2 km" or "850 m". Polish-locale comma decimal.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Naive ETA: distance / average speed. Returns seconds.
 * Override speed if we ever wire reported speed from the geolocation API.
 */
export function etaSeconds(meters: number, avgSpeedKmh = DEFAULT_AVG_SPEED_KMH): number {
  if (!Number.isFinite(meters) || meters <= 0 || avgSpeedKmh <= 0) return 0;
  const metersPerSec = (avgSpeedKmh * 1000) / 3600;
  return Math.round(meters / metersPerSec);
}

/**
 * "~3 min" or "~45 s". Switches unit at 60s.
 */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `~${seconds} s`;
  return `~${Math.round(seconds / 60)} min`;
}

/**
 * "8 s temu" / "2 min temu" — readable age of a timestamp.
 */
export function formatAge(tsMs: number, nowMs: number = Date.now()): string {
  const sec = Math.max(0, Math.round((nowMs - tsMs) / 1000));
  if (sec < 60) return `${sec} s temu`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  return `${h} h temu`;
}
