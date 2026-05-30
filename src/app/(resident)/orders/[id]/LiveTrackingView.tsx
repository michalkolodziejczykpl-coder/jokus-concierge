'use client';

// Resident-side receiver: subscribes to the same Supabase Realtime channel
// the jokusor broadcasts to. Shows distance + ETA + age-of-last-update.
//
// **No DB writes** — strictly listening to broadcast events. Resident's own
// position is fetched once via browser geolocation (with permission) to
// compute "X km od Ciebie". If permission is denied, we just show jokusor's
// position freshness without distance.

import { useEffect, useRef, useState } from 'react';
import { MapPin, Radio, RadioTower } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type BrowserSupabase = ReturnType<typeof createClient>;
import {
  etaSeconds,
  formatAge,
  formatDistance,
  formatEta,
  haversineDistanceM,
  type LatLng
} from '@/lib/tracking/geo';
import TrackingMap from '@/components/resident/TrackingMap';

type Props = {
  orderId: string;
};

type JokusorPos = {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number;
  speed?: number | null;
};

const CHANNEL_PREFIX = 'tracking:order:';
const EVENT = 'location';
// If no broadcast received within this many ms, we show "Czekam na sygnał".
const STALE_THRESHOLD_MS = 60_000;

export default function LiveTrackingView({ orderId }: Props) {
  const [jokusorPos, setJokusorPos] = useState<JokusorPos | null>(null);
  const [residentPos, setResidentPos] = useState<LatLng | null>(null);
  const [residentGeoError, setResidentGeoError] = useState<string | null>(null);
  const [, setNowTick] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<BrowserSupabase | null>(null);
  const closeAlertedRef = useRef(false);

  // Subscribe to the jokusor's broadcast channel
  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    const channel = supabase.channel(`${CHANNEL_PREFIX}${orderId}`);
    channelRef.current = channel;

    channel.on('broadcast', { event: EVENT }, ({ payload }) => {
      const p = payload as Partial<JokusorPos>;
      if (typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.ts === 'number') {
        setJokusorPos({
          lat: p.lat,
          lng: p.lng,
          ts: p.ts,
          accuracy: p.accuracy,
          speed: p.speed ?? null
        });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      supabaseRef.current = null;
    };
  }, [orderId]);

  // Resident's own position (one-shot — they're at home, not moving)
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setResidentGeoError('Twoja przeglądarka nie wspiera geolokalizacji.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setResidentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setResidentGeoError(
            'Brak zgody na Twoją lokalizację — pokażemy tylko aktualność sygnału jokusora.'
          );
        } else {
          setResidentGeoError('Nie udało się pobrać Twojej lokalizacji.');
        }
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 }
    );
  }, []);

  // Tick every second to refresh "X s temu" labels
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const hasPos = jokusorPos !== null;
  const isStale = hasPos && now - jokusorPos.ts > STALE_THRESHOLD_MS;
  const distance =
    hasPos && residentPos
      ? haversineDistanceM(residentPos, { lat: jokusorPos.lat, lng: jokusorPos.lng })
      : null;
  const eta = distance !== null ? etaSeconds(distance) : null;

  // Buzz once when the jokusor gets close (<200 m); reset past 350 m (hysteresis).
  useEffect(() => {
    if (distance === null) return;
    if (distance < 200 && !closeAlertedRef.current) {
      closeAlertedRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
    } else if (distance > 350) {
      closeAlertedRef.current = false;
    }
  }, [distance]);

  return (
    <section className="mt-6 rounded-2xl border-2 border-green-500/40 bg-green-50 p-6 dark:border-green-500/30 dark:bg-green-950/20">
      <header className="flex items-center gap-3">
        {hasPos && !isStale ? (
          <RadioTower
            className="h-6 w-6 shrink-0 animate-pulse text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
        ) : (
          <Radio className="h-6 w-6 shrink-0 text-neutral-500" aria-hidden="true" />
        )}
        <h2 className="text-xl font-bold text-green-900 dark:text-green-100">
          {hasPos && !isStale
            ? 'Jokusor jest w drodze'
            : hasPos && isStale
              ? 'Sygnał starszy niż minutę'
              : 'Czekam na sygnał…'}
        </h2>
      </header>

      <div className="mt-4 space-y-2 text-sm">
        {hasPos && (
          <p className="flex items-center gap-2 text-green-900 dark:text-green-200">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {distance !== null ? (
                <>
                  <strong className="font-semibold">{formatDistance(distance)}</strong> od Ciebie
                  {eta !== null && eta > 0 ? <> · ETA {formatEta(eta)}</> : null}
                </>
              ) : (
                'Pozycja na żywo'
              )}{' '}
              <span className="text-green-700/80 dark:text-green-300/80">
                · aktualizacja {formatAge(jokusorPos.ts, now)}
              </span>
            </span>
          </p>
        )}

        {!hasPos && (
          <p className="text-green-800/90 dark:text-green-200/80">
            Czekamy aż jokusor włączy udostępnianie pozycji.
          </p>
        )}

        {residentGeoError && (
          <p className="text-xs text-green-800/80 dark:text-green-200/80">{residentGeoError}</p>
        )}
      </div>

      {hasPos && jokusorPos && (
        <TrackingMap
          jokusor={{ lat: jokusorPos.lat, lng: jokusorPos.lng }}
          resident={residentPos}
        />
      )}

      <p className="mt-4 text-xs text-green-900/60 dark:text-green-200/60">
        Pozycja na żywo nie jest zapisywana w bazie — strumień działa tylko podczas tego widoku.
      </p>
    </section>
  );
}
