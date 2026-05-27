'use client';

// Jokusor-side broadcaster: when toggled on, watches browser geolocation and
// broadcasts every update to `tracking:order:${orderId}`.
//
// **No DB writes** — strictly Supabase Realtime broadcast (RODO requirement
// in CLAUDE.md). The resident's order page subscribes to the same channel.
//
// Channel name + event must match LiveTrackingView on the resident side.

import { useEffect, useRef, useState } from 'react';
import { MapPin, MapPinOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type BrowserSupabase = ReturnType<typeof createClient>;

type Props = {
  orderId: string;
};

const CHANNEL_PREFIX = 'tracking:order:';
const EVENT = 'location';

export default function LiveTrackingShare({ orderId }: Props) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  // Refs so we can clean up across renders
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const supabaseRef = useRef<BrowserSupabase | null>(null);

  // Stop sharing on unmount
  useEffect(() => {
    return () => {
      stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (channelRef.current && supabaseRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }
    channelRef.current = null;
    subscribedRef.current = false;
    setSharing(false);
  }

  function start() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('Twoja przeglądarka nie wspiera geolokalizacji.');
      return;
    }

    const supabase = createClient();
    supabaseRef.current = supabase;
    const channel = supabase.channel(`${CHANNEL_PREFIX}${orderId}`);
    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true;
      }
    });

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (!subscribedRef.current || !channelRef.current) return;
        const payload = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed
        };
        await channelRef.current.send({
          type: 'broadcast',
          event: EVENT,
          payload
        });
        setUpdates((n) => n + 1);
        setLastSentAt(payload.ts);
      },
      (err) => {
        console.error('[LiveTrackingShare] geolocation error', err);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Brak zgody na lokalizację. Włącz w ustawieniach przeglądarki.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Pozycja niedostępna (sygnał GPS).');
        } else {
          setError('Błąd geolokalizacji.');
        }
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000
      }
    );
    watchIdRef.current = watchId;
    setSharing(true);
    setUpdates(0);
    setLastSentAt(null);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {sharing ? (
            <>
              <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Udostępniam lokalizację
              </span>
            </>
          ) : (
            <>
              <MapPinOff
                className="h-4 w-4 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
              <span className="text-neutral-600 dark:text-neutral-400">
                Tracking wyłączony
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={sharing ? stop : start}
          className={
            sharing
              ? 'rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900'
              : 'rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700'
          }
        >
          {sharing ? 'Wyłącz' : 'Włącz'}
        </button>
      </div>

      {sharing && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          Wysłanych aktualizacji: {updates}
          {lastSentAt ? ` · ostatnia o ${new Date(lastSentAt).toLocaleTimeString('pl-PL')}` : ''}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
