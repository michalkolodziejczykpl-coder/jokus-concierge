'use client';

// Live map for order tracking. Loads Leaflet from CDN (no npm dependency, so the
// build/typecheck stay untouched) and draws two circle markers: the jokusor
// (orange, live) and the resident (blue). Circle markers avoid Leaflet's
// default-icon image-path issues entirely.

import { useEffect, useRef, useState } from 'react';

type LL = { lat: number; lng: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Leaflet = any;

let leafletPromise: Promise<Leaflet> | null = null;

function loadLeaflet(): Promise<Leaflet> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as unknown as { L?: Leaflet };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise<Leaflet>((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: Leaflet }).L);
    script.onerror = () => reject(new Error('Nie udało się wczytać mapy'));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

export default function TrackingMap({ jokusor, resident }: { jokusor: LL; resident: LL | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet>(null);
  const jokMarkerRef = useRef<Leaflet>(null);
  const resMarkerRef = useRef<Leaflet>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Init once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L: Leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([jokusor.lat, jokusor.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(
          map
        );
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Place / move markers when positions change (and once the map is ready).
  useEffect(() => {
    const w = window as unknown as { L?: Leaflet };
    const L = w.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (!jokMarkerRef.current) {
      jokMarkerRef.current = L.circleMarker([jokusor.lat, jokusor.lng], {
        radius: 9,
        color: '#ea580c',
        fillColor: '#f97316',
        fillOpacity: 0.9,
        weight: 3
      })
        .addTo(map)
        .bindTooltip('Jokusor');
    } else {
      jokMarkerRef.current.setLatLng([jokusor.lat, jokusor.lng]);
    }

    if (resident) {
      if (!resMarkerRef.current) {
        resMarkerRef.current = L.circleMarker([resident.lat, resident.lng], {
          radius: 8,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
          weight: 3
        })
          .addTo(map)
          .bindTooltip('Ty');
      } else {
        resMarkerRef.current.setLatLng([resident.lat, resident.lng]);
      }
    }

    if (resident) {
      map.fitBounds(
        [
          [jokusor.lat, jokusor.lng],
          [resident.lat, resident.lng]
        ],
        { padding: [40, 40], maxZoom: 16 }
      );
    } else {
      map.setView([jokusor.lat, jokusor.lng], 15);
    }
  }, [ready, jokusor.lat, jokusor.lng, resident?.lat, resident?.lng, resident]);

  // Tear down on unmount.
  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    },
    []
  );

  if (failed) {
    return (
      <p className="mt-4 text-xs text-green-800/80 dark:text-green-200/80">
        Nie udało się wczytać mapy — pokazujemy odległość i ETA powyżej.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mt-4 h-64 w-full overflow-hidden rounded-xl border border-green-500/30"
      aria-label="Mapa pozycji jokusora"
    />
  );
}
