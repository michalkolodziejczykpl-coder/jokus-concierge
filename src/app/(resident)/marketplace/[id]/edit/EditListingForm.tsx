'use client';

// Edit form for an existing listing. PATCHes /api/marketplace/listings/[id].
// Photos and pickup address are not edited here (separate concern) — this
// covers the fields sellers most often want to change: title, description,
// price, category, condition, delivery option.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateListingSchema } from '@/lib/utils/validators';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  DELIVERY_OPTION_LABELS,
  type ListingCategory,
  type ListingCondition,
  type DeliveryOption
} from '@/lib/types/marketplace';

type Props = {
  listingId: string;
  initial: {
    title: string;
    description: string;
    category: ListingCategory;
    price: number;
    condition: ListingCondition;
    delivery_option: DeliveryOption;
  };
};

type Errors = Record<string, string>;

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600';

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

export default function EditListingForm({ listingId, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(e.currentTarget);
    const body = {
      title: String(fd.get('title') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      category: String(fd.get('category') ?? ''),
      price: String(fd.get('price') ?? ''),
      condition: String(fd.get('condition') ?? ''),
      delivery_option: String(fd.get('delivery_option') ?? 'migmig_or_pickup')
    };

    const valid = updateListingSchema.safeParse(body);
    if (!valid.success) {
      const flat = valid.error.flatten();
      const fieldErrors: Errors = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) {
        if (v && v.length > 0) fieldErrors[k] = v[0];
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setServerError(data.message ?? `Nie udało się zapisać (${data.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      router.push(`/marketplace/${listingId}`);
      router.refresh();
    } catch (err) {
      console.error('[EditListingForm.submit]', err);
      setServerError('Błąd sieci. Spróbuj ponownie.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Tytuł" error={errors.title}>
        <input
          name="title"
          type="text"
          required
          maxLength={100}
          defaultValue={initial.title}
          className={inputClass}
        />
      </Field>

      <Field label="Opis" error={errors.description}>
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={initial.description}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Kategoria" error={errors.category}>
          <select name="category" defaultValue={initial.category} className={inputClass}>
            {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Stan" error={errors.condition}>
          <select name="condition" defaultValue={initial.condition} className={inputClass}>
            {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((k) => (
              <option key={k} value={k}>
                {CONDITION_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Cena (zł)" error={errors.price}>
          <input
            name="price"
            type="number"
            min={5}
            max={50000}
            step={1}
            required
            defaultValue={initial.price}
            className={inputClass}
          />
        </Field>

        <Field label="Sposób przekazania" error={errors.delivery_option}>
          <select
            name="delivery_option"
            defaultValue={initial.delivery_option}
            className={inputClass}
          >
            {(Object.keys(DELIVERY_OPTION_LABELS) as DeliveryOption[]).map((k) => (
              <option key={k} value={k}>
                {DELIVERY_OPTION_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

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
        {busy ? 'Zapisuję…' : 'Zapisz zmiany'}
      </button>
    </form>
  );
}
