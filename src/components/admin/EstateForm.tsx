'use client';

// Create / edit an estate. POST /api/admin/estates or PATCH /api/admin/estates/[id].

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { estateSchema } from '@/lib/utils/validators';

type Initial = {
  id?: string;
  name: string;
  city: string;
  voivodeship: string;
  postal_codes: string; // comma-joined
  is_active: boolean;
};
type Errors = Record<string, string>;

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

function Field({
  label,
  children,
  error,
  hint
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export default function EstateForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const postal = String(fd.get('postal_codes') ?? '')
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      name: String(fd.get('name') ?? '').trim(),
      city: String(fd.get('city') ?? '').trim(),
      voivodeship: String(fd.get('voivodeship') ?? '').trim(),
      postal_codes: postal,
      is_active: fd.get('is_active') === 'on'
    };
    const valid = estateSchema.safeParse(body);
    if (!valid.success) {
      const flat = valid.error.flatten();
      const fe: Errors = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v && v.length) fe[k] = v[0];
      setErrors(fe);
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);
    try {
      const url = isEdit ? `/api/admin/estates/${initial.id}` : '/api/admin/estates';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const dt = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(
          dt.error === 'estate_exists'
            ? 'Osiedle o tej nazwie i mieście już istnieje.'
            : `Nie udało się zapisać (${dt.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      router.push('/estates');
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa osiedla" error={errors.name}>
          <input
            name="name"
            type="text"
            required
            defaultValue={initial.name}
            className={inputClass}
          />
        </Field>
        <Field label="Miasto" error={errors.city}>
          <input
            name="city"
            type="text"
            required
            defaultValue={initial.city}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Województwo" error={errors.voivodeship}>
        <input
          name="voivodeship"
          type="text"
          defaultValue={initial.voivodeship}
          className={inputClass}
        />
      </Field>
      <Field
        label="Kody pocztowe"
        error={errors.postal_codes}
        hint="Oddziel przecinkami, np. 54-129, 54-130"
      >
        <input
          name="postal_codes"
          type="text"
          required
          defaultValue={initial.postal_codes}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={initial.is_active}
          className="h-4 w-4 accent-orange-600"
        />
        Osiedle aktywne (widoczne dla mieszkańców)
      </label>

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
        disabled={busy}
        className="w-full rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Zapisuję…' : isEdit ? 'Zapisz zmiany' : 'Dodaj osiedle'}
      </button>
    </form>
  );
}
