'use client';

// Create / edit a restaurant partner (gastro payer). POST
// /api/admin/gastro/restaurants or PATCH /api/admin/gastro/restaurants/[id].
// Same local-Field idiom as the other admin forms.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { restaurantSchema } from '@/lib/utils/validators';

type Initial = {
  id?: string;
  name: string;
  nip: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  notes: string;
};
type Errors = Record<string, string>;

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

export default function RestaurantForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name') ?? '').trim(),
      nip: String(fd.get('nip') ?? '').trim(),
      address: String(fd.get('address') ?? '').trim(),
      contact_email: String(fd.get('contact_email') ?? '').trim(),
      contact_phone: String(fd.get('contact_phone') ?? '').trim(),
      is_active: fd.get('is_active') === 'on',
      notes: String(fd.get('notes') ?? '').trim()
    };
    const valid = restaurantSchema.safeParse(body);
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
      const url = isEdit
        ? `/api/admin/gastro/restaurants/${initial.id}`
        : '/api/admin/gastro/restaurants';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const dt = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(`Nie udało się zapisać (${dt.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      router.push('/gastro/restaurants');
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa restauracji" error={errors.name}>
          <input
            name="name"
            type="text"
            required
            defaultValue={initial.name}
            className={inputClass}
          />
        </Field>
        <Field label="NIP (do faktury zbiorczej)" error={errors.nip}>
          <input
            name="nip"
            type="text"
            inputMode="numeric"
            defaultValue={initial.nip}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Adres" error={errors.address}>
        <input name="address" type="text" defaultValue={initial.address} className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="E-mail kontaktowy" error={errors.contact_email}>
          <input
            name="contact_email"
            type="email"
            defaultValue={initial.contact_email}
            className={inputClass}
          />
        </Field>
        <Field label="Telefon kontaktowy" error={errors.contact_phone}>
          <input
            name="contact_phone"
            type="tel"
            defaultValue={initial.contact_phone}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notatki (wewnętrzne)" error={errors.notes}>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={initial.notes}
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
        Współpraca aktywna (można logować kursy)
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
        {busy ? 'Zapisuję…' : isEdit ? 'Zapisz zmiany' : 'Dodaj restaurację'}
      </button>
    </form>
  );
}
