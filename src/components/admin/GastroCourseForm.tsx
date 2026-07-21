'use client';

// Log one delivered gastro course. POST /api/admin/gastro/courses — the
// server computes and freezes the fee from fee_config('gastro'); the preview
// shown here is informational only.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gastroCourseSchema } from '@/lib/utils/validators';
import { toGr, gastroFeeGr } from '@/lib/payments/pricing';
import { formatPLN } from '@/lib/utils/formatters';

type Option = { id: string; label: string };

type Props = {
  restaurants: Option[];
  jokusors: Option[];
  /** Today's date (Warsaw) as YYYY-MM-DD — the form default. */
  today: string;
  /** Current gastro pricing for the fee preview; null = config missing. */
  pricing: { baseFee: number; includedKm: number; perKmFee: number } | null;
};

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

function Field({
  label,
  children,
  error
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export default function GastroCourseForm({ restaurants, jokusors, today, pricing }: Props) {
  const router = useRouter();
  const [distance, setDistance] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const previewGr = useMemo(() => {
    const km = Number(distance.replace(',', '.'));
    if (!pricing || !Number.isFinite(km) || km <= 0) return null;
    return gastroFeeGr(km, toGr(pricing.baseFee), pricing.includedKm, toGr(pricing.perKmFee));
  }, [distance, pricing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      restaurant_id: String(fd.get('restaurant_id') ?? ''),
      jokusor_id: String(fd.get('jokusor_id') ?? ''),
      delivered_on: String(fd.get('delivered_on') ?? ''),
      distance_km: String(fd.get('distance_km') ?? '').replace(',', '.'),
      notes: String(fd.get('notes') ?? '').trim()
    };
    const valid = gastroCourseSchema.safeParse(body);
    if (!valid.success) {
      const flat = valid.error.flatten();
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v && v.length) fe[k] = v[0];
      setErrors(fe);
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);
    try {
      const res = await fetch('/api/admin/gastro/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const dt = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(
          dt.error === 'fee_config_missing'
            ? 'Brak konfiguracji gastro w fee_config — zastosuj migrację.'
            : dt.error === 'restaurant_inactive'
              ? 'Ta restauracja ma nieaktywną współpracę.'
              : `Nie udało się zapisać (${dt.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      form.reset();
      setDistance('');
      setBusy(false);
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Restauracja" error={errors.restaurant_id}>
          <select name="restaurant_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              — wybierz —
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jokusor" error={errors.jokusor_id}>
          <select name="jokusor_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              — wybierz —
            </option>
            {jokusors.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data kursu" error={errors.delivered_on}>
          <input
            name="delivered_on"
            type="date"
            required
            defaultValue={today}
            max={today}
            className={inputClass}
          />
        </Field>
        <Field label="Dystans (km)" error={errors.distance_km}>
          <input
            name="distance_km"
            type="text"
            inputMode="decimal"
            required
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="np. 4 lub 7,5"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notatka (opcjonalnie)" error={errors.notes}>
        <input name="notes" type="text" maxLength={500} className={inputClass} />
      </Field>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {previewGr != null ? (
          <>
            Opłata dla restauracji (netto):{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatPLN(previewGr / 100)}
            </span>{' '}
            — wyliczy i utrwali ją serwer wg cennika z fee_config.
          </>
        ) : pricing ? (
          <>
            Cennik: {formatPLN(pricing.baseFee)} netto do {pricing.includedKm} km, +
            {formatPLN(pricing.perKmFee)} za każdy kolejny rozpoczęty km.
          </>
        ) : (
          'Brak konfiguracji gastro w fee_config — logowanie kursów nie zadziała.'
        )}
      </p>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !pricing}
        className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Zapisuję…' : 'Zapisz kurs'}
      </button>
    </form>
  );
}
