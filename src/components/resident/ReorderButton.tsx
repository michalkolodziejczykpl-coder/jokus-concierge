'use client';

// "Zamów ponownie" — copies a past grocery order's items into the cart and
// routes to the shop. POST /api/orders/[id]/reorder.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

export default function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReorder() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: 'POST' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Nie udało się powtórzyć (${d.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      router.push('/sklep');
    } catch {
      setError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onReorder}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50 dark:border-orange-800/50 dark:text-orange-300 dark:hover:bg-orange-950/30"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Dodaję do koszyka…' : 'Zamów ponownie'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
