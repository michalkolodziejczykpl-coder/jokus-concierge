'use client';

// Resident profile: name, phone, default address. PATCH /api/profile.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { residentProfileSchema } from '@/lib/utils/validators';

type Estate = { id: string; name: string };
type Initial = {
  full_name: string;
  phone: string;
  estate_id: string;
  street: string;
  building: string;
  apartment: string;
  city: string;
  postal_code: string;
};
type Errors = Record<string, string>;

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

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

export default function ResidentProfileForm({
  estates,
  initial
}: {
  estates: Estate[];
  initial: Initial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      full_name: String(fd.get('full_name') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      address: {
        estate_id: String(fd.get('estate_id') ?? ''),
        street: String(fd.get('street') ?? '').trim(),
        building: String(fd.get('building') ?? '').trim(),
        apartment: String(fd.get('apartment') ?? '').trim(),
        city: String(fd.get('city') ?? '').trim(),
        postal_code: String(fd.get('postal_code') ?? '').trim()
      }
    };
    const valid = residentProfileSchema.safeParse(body);
    if (!valid.success) {
      const flat = valid.error.flatten();
      const fe: Errors = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) if (v && v.length) fe[k] = v[0];
      // nested address errors
      const af = flat.fieldErrors as Record<string, string[]>;
      void af;
      setErrors(fe);
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setServerError(d.message ?? `Nie udało się zapisać (${d.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      setSaved(true);
      setBusy(false);
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Imię i nazwisko" error={errors.full_name}>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={initial.full_name}
          className={inputClass}
        />
      </Field>
      <Field label="Telefon" error={errors.phone}>
        <input
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          placeholder="np. 600 100 200"
          className={inputClass}
        />
      </Field>

      <fieldset className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <legend className="px-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Adres domyślny
        </legend>
        <Field label="Osiedle" error={errors.estate_id}>
          <select name="estate_id" required defaultValue={initial.estate_id} className={inputClass}>
            <option value="" disabled>
              — wybierz —
            </option>
            {estates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ulica" error={errors.street}>
          <input
            name="street"
            type="text"
            required
            defaultValue={initial.street}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nr budynku" error={errors.building}>
            <input
              name="building"
              type="text"
              required
              defaultValue={initial.building}
              className={inputClass}
            />
          </Field>
          <Field label="Mieszkanie">
            <input
              name="apartment"
              type="text"
              defaultValue={initial.apartment}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kod pocztowy" error={errors.postal_code}>
            <input
              name="postal_code"
              type="text"
              required
              pattern="[0-9]{2}-[0-9]{3}"
              defaultValue={initial.postal_code}
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
      </fieldset>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {serverError}
        </div>
      )}
      {saved && !serverError && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
          Zapisano zmiany.
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Zapisuję…' : 'Zapisz zmiany'}
      </button>
    </form>
  );
}
