'use client';

// Admin form: per-jokusor billing v2 — payout share (% of each order's
// service price, default 50%) + monthly subscription (default 0 zł).
// PATCHes /api/admin/jokusors/[userId]/billing. Same local-Field idiom as the
// other admin forms (ModuleForm / EstateForm) — extraction to a shared
// FormBase is a separate cleanup task.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jokusorBillingSchema } from '@/lib/utils/validators';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ' +
  'focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 ' +
  'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

type Props = {
  userId: string;
  initial: {
    payout_share_percent: number;
    subscription_amount: number;
  };
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function JokusorBillingForm({ userId, initial }: Props) {
  const router = useRouter();
  const [sharePercent, setSharePercent] = useState(String(initial.payout_share_percent));
  const [subscription, setSubscription] = useState(String(initial.subscription_amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = jokusorBillingSchema.safeParse({
      payout_share_percent: sharePercent,
      subscription_amount: subscription
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Sprawdź wartości formularza.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/jokusors/${userId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Błąd zapisu (${res.status})`);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Udział jokusora w cenie usługi (%)">
        <input
          type="number"
          step="1"
          min="0"
          max="100"
          value={sharePercent}
          onChange={(e) => setSharePercent(e.target.value)}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Domyślnie 50% — resztę zatrzymuje platforma. Napiwki zawsze w 100% trafiają do jokusora.
        Cennik usług (kwoty stałe oraz % i minimum dla zakupów) edytujesz w module, w sekcji Moduły
        usług.
      </p>

      <Field label="Abonament (zł / miesiąc)">
        <input
          type="number"
          step="1"
          min="0"
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Na czas MVP domyślnie 0 zł — mechanizm zostaje na przyszłość.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
          Zapisano.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {saving ? 'Zapisywanie…' : 'Zapisz rozliczenia'}
      </button>
    </form>
  );
}
