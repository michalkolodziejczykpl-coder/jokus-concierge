'use client';

// Edit + soft-delete actions shown under each card on /marketplace/my-listings.
// Kept outside the card's <Link> so the buttons don't trigger navigation.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function ListingCardActions({
  listingId,
  status
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (busy) return;
    if (!window.confirm('Usunąć to ogłoszenie? Zniknie z marketplace.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Nie udało się usunąć (${data.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Błąd sieci.');
      setBusy(false);
    }
  }

  const removed = status === 'removed';

  return (
    <div className="mt-2 flex items-center gap-2">
      <Link
        href={`/marketplace/${listingId}/edit`}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edytuj
      </Link>
      {!removed && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Usuwam…' : 'Usuń'}
        </button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
