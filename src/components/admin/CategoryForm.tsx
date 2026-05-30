'use client';

// Create / edit a product category. Slug auto-fills from the name until the
// admin edits it by hand. POST/PATCH /api/admin/product-categories.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { productCategorySchema } from '@/lib/utils/validators';

type Initial = { id?: string; name: string; slug: string; sort_order: number | string };
type Errors = Record<string, string>;

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

const PL_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ż: 'z',
  ź: 'z'
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśżź]/g, (ch) => PL_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CategoryForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial.id);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      sort_order: String(fd.get('sort_order') ?? '0')
    };
    const valid = productCategorySchema.safeParse(body);
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
        ? `/api/admin/product-categories/${initial.id}`
        : '/api/admin/product-categories';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const dt = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(
          dt.error === 'slug_taken' ? 'Ten slug jest zajęty.' : `Błąd (${dt.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      router.push('/product-categories');
      router.refresh();
    } catch {
      setServerError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Nazwa
        </span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={inputClass}
        />
        {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Slug (wylicza się sam z nazwy)
        </span>
        <input
          type="text"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={inputClass}
        />
        {errors.slug && <span className="mt-1 block text-xs text-red-600">{errors.slug}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Kolejność
        </span>
        <input
          name="sort_order"
          type="number"
          min={0}
          step={1}
          defaultValue={String(initial.sort_order)}
          className={`${inputClass} max-w-[8rem]`}
        />
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
        className="rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
      >
        {busy ? 'Zapisuję…' : isEdit ? 'Zapisz' : 'Dodaj kategorię'}
      </button>
    </form>
  );
}
