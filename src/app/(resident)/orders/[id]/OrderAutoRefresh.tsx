'use client';

// Lightweight auto-refresh for /orders/[id]. Every 10s calls router.refresh()
// so the server component re-fetches and shows the latest order.status.
// Cheaper than wiring a Supabase Realtime channel for sprint 4. Future
// sprints replace this with a postgres_changes subscription on the order row.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_MS = 10_000;

export default function OrderAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
