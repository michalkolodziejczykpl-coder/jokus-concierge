'use client';

// Generic admin delete button (modules, estates). Confirms, calls DELETE,
// refreshes. Shows the server's friendly error if the row is still referenced.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteButton({
  url,
  confirmText,
  inUseMessage
}: {
  url: string;
  confirmText: string;
  inUseMessage?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (busy) return;
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        if (d.error && d.error.endsWith('_in_use') && inUseMessage) setError(inUseMessage);
        else setError(`Nie udało się usunąć (${d.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Usuwam…' : 'Usuń'}
      </button>
      {error && (
        <span className="mt-1 max-w-[16rem] text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
