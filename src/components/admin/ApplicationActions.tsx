'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

export default function ApplicationActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: 'approve' | 'reject') {
    if (busy) return;
    if (kind === 'reject' && !window.confirm('Odrzucić to zgłoszenie?')) return;
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jokusors/${userId}/${kind}`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Błąd (${data.error ?? res.status}).`);
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError('Błąd sieci.');
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => act('approve')}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {busy === 'approve' ? 'Zatwierdzam…' : 'Zatwierdź'}
      </button>
      <button
        type="button"
        onClick={() => act('reject')}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {busy === 'reject' ? 'Odrzucam…' : 'Odrzuć'}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
