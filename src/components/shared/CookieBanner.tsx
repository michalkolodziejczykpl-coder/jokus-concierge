'use client';

// Informational cookie bar. We use only strictly-necessary cookies (login session) —
// no analytics, no marketing — so a single "Rozumiem" acknowledgement is sufficient under
// RODO / ePrivacy (consent is not required for strictly-necessary cookies). If analytics or
// marketing tags are ever added, this must be upgraded to a categorised consent manager.

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'migmig.cookie-ack.v1';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true);
    } catch {
      // localStorage blocked (private mode / SSR mismatch) — show banner, harmless.
      setVisible(true);
    }
  }, []);

  function acknowledge() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore — worst case the banner reappears next visit.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Informacja o plikach cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 px-4 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 text-sm text-neutral-700 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex-1">
          Używamy wyłącznie plików cookies niezbędnych do działania serwisu (utrzymanie sesji
          logowania). Nie stosujemy cookies analitycznych ani marketingowych. Więcej w{' '}
          <Link href="/cookies" className="text-brand hover:underline">
            Polityce cookies
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="shrink-0 rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-600"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
