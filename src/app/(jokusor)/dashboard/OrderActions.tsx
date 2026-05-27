'use client';

// Per-order action buttons rendered on the jokusor dashboard.
// Each click fires a POST and refreshes the route on success.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'pending' | 'accepted' | 'in_progress';

type Props = {
  orderId: string;
  status: Status;
};

const ACTION_BY_STATUS: Record<Status, { path: string; label: string; busy: string }> = {
  pending: { path: 'accept', label: 'Akceptuj', busy: 'Akceptuję…' },
  accepted: { path: 'start', label: 'Rozpocznij', busy: 'Startuję…' },
  in_progress: { path: 'complete', label: 'Zakończ', busy: 'Kończę…' }
};

export default function OrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const action = ACTION_BY_STATUS[status];

  async function fire() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/${action.path}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(data.message ?? `Nie udało się (${data.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      console.error('[OrderActions.fire]', e);
      setError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={fire}
        disabled={busy}
        className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? action.busy : action.label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
