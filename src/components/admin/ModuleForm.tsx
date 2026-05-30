'use client';

// Create / edit a service module. POST /api/admin/modules or
// PATCH /api/admin/modules/[id]. Checkboxes are sent as real booleans.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moduleSchema } from '@/lib/utils/validators';
import {
  MODULE_CATEGORY_LABELS,
  MODULE_CATEGORY_ORDER,
  PRICE_UNIT_LABELS,
  type ModuleCategory,
  type PriceUnit
} from '@/lib/types/modules';

type Initial = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon_name: string;
  base_price: number | string;
  price_unit: PriceUnit;
  estimated_duration_min: number | string;
  requires_pickup: boolean;
  requires_age_verification: boolean;
  is_global: boolean;
  sort_order: number | string;
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

const PRICE_UNITS: PriceUnit[] = ['fixed', 'hourly', 'per_km', 'percent'];

export default function ModuleForm({ initial }: { initial: Initial }) {
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
      slug: String(fd.get('slug') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      category: String(fd.get('category') ?? ''),
      icon_name: String(fd.get('icon_name') ?? '').trim(),
      base_price: String(fd.get('base_price') ?? ''),
      price_unit: String(fd.get('price_unit') ?? 'fixed'),
      estimated_duration_min: String(fd.get('estimated_duration_min') ?? ''),
      requires_pickup: fd.get('requires_pickup') === 'on',
      requires_age_verification: fd.get('requires_age_verification') === 'on',
      is_global: fd.get('is_global') === 'on',
      sort_order: String(fd.get('sort_order') ?? '0')
    };
    const valid = moduleSchema.safeParse(body);
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
      const url = isEdit ? `/api/admin/modules/${initial.id}` : '/api/admin/modules';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const dt = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(
          dt.error === 'slug_taken'
            ? 'Ten slug jest już zajęty — wybierz inny.'
            : `Nie udało się zapisać (${dt.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      router.push('/modules');
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa" error={errors.name}>
          <input
            name="name"
            type="text"
            required
            defaultValue={initial.name}
            className={inputClass}
          />
        </Field>
        <Field label="Slug (w adresie URL)" error={errors.slug} hint="małe litery, cyfry, myślniki">
          <input
            name="slug"
            type="text"
            required
            defaultValue={initial.slug}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Opis" error={errors.description}>
        <textarea
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={initial.description}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Kategoria" error={errors.category}>
          <select name="category" defaultValue={initial.category} className={inputClass}>
            {MODULE_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {MODULE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Ikona (nazwa Lucide)"
          error={errors.icon_name}
          hint="np. ShoppingCart, Package, Dog"
        >
          <input
            name="icon_name"
            type="text"
            defaultValue={initial.icon_name}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Cena bazowa (zł)" error={errors.base_price}>
          <input
            name="base_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={String(initial.base_price)}
            className={inputClass}
          />
        </Field>
        <Field label="Jednostka ceny" error={errors.price_unit}>
          <select name="price_unit" defaultValue={initial.price_unit} className={inputClass}>
            {PRICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {PRICE_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Czas (min)" error={errors.estimated_duration_min}>
          <input
            name="estimated_duration_min"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={String(initial.estimated_duration_min)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Kolejność wyświetlania"
        error={errors.sort_order}
        hint="mniejsza liczba = wyżej"
      >
        <input
          name="sort_order"
          type="number"
          min={0}
          step={1}
          defaultValue={String(initial.sort_order)}
          className={`${inputClass} max-w-[8rem]`}
        />
      </Field>

      <fieldset className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input
            name="requires_pickup"
            type="checkbox"
            defaultChecked={initial.requires_pickup}
            className="h-4 w-4 accent-orange-600"
          />
          Wymaga odbioru (np. paczka, zakupy)
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input
            name="requires_age_verification"
            type="checkbox"
            defaultChecked={initial.requires_age_verification}
            className="h-4 w-4 accent-orange-600"
          />
          Wymaga weryfikacji wieku (alkohol/tytoń)
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input
            name="is_global"
            type="checkbox"
            defaultChecked={initial.is_global}
            className="h-4 w-4 accent-orange-600"
          />
          Dostępny globalnie (na wszystkich osiedlach)
        </label>
      </fieldset>

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
        {busy ? 'Zapisuję…' : isEdit ? 'Zapisz zmiany' : 'Dodaj moduł'}
      </button>
    </form>
  );
}
