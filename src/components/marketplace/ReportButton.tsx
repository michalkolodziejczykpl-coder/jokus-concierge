'use client';

// "Zgłoś ogłoszenie" — POSTs to the report endpoint. Shown to non-owners on the
// listing detail page. After a successful report (or if already reported in this
// session) the button locks to a thank-you state.

import { useState } from 'react';
import { Flag } from 'lucide-react';

export default function ReportButton({ listingId }: { listingId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onReport() {
    if (state !== 'idle') return;
    if (!window.confirm('Zgłosić to ogłoszenie do moderacji?')) return;
    setState('busy');
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/report`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error === 'cannot_report_own') setError('Nie możesz zgłosić własnego ogłoszenia.');
        else setError(`Nie udało się zgłosić (${data.error ?? res.status}).`);
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Błąd sieci.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
        Dziękujemy — zgłoszenie trafiło do moderacji.
      </p>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onReport}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-red-600 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-red-400"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {state === 'busy' ? 'Zgłaszam…' : 'Zgłoś ogłoszenie'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
