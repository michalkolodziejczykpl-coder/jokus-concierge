'use client';

// Create / edit a product. Image uploads to the public product-images bucket
// (admin-only write). POST/PATCH /api/admin/products.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { productSchema } from '@/lib/utils/validators';

const BUCKET = 'product-images';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Category = { id: string; name: string };
type Initial = {
  id?: string;
  category_id: string | null;
  name: string;
  brand: string;
  unit: string;
  estimated_price: number | string;
  image_url: string;
  is_active: boolean;
  sort_order: number | string;
  old_price: number | string;
  badge: string;
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

const UNITS = ['szt.', 'kg', 'dag', 'g', 'l', 'ml', 'opak.', 'zgrz.'];

export default function ProductForm({
  categories,
  initial
}: {
  categories: Category[];
  initial: Initial;
}) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const isEdit = Boolean(initial.id);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(initial.image_url);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErrors((p) => ({ ...p, image: 'Tylko obrazy' }));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setErrors((p) => ({ ...p, image: 'Plik > 5 MB' }));
      return;
    }
    setErrors((p) => {
      const { image: _d, ...rest } = p;
      return rest;
    });
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `products/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new Error(`Nie udało się wgrać zdjęcia: ${error.message}`);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const catRaw = String(fd.get('category_id') ?? '');
    setBusy(true);
    setServerError(null);
    try {
      let imageUrl = initial.image_url;
      if (photoFile) imageUrl = await uploadImage(photoFile);
      const body = {
        category_id: catRaw === '' ? null : catRaw,
        name: String(fd.get('name') ?? '').trim(),
        brand: String(fd.get('brand') ?? '').trim(),
        unit: String(fd.get('unit') ?? 'szt.'),
        estimated_price: String(fd.get('estimated_price') ?? ''),
        image_url: imageUrl,
        is_active: fd.get('is_active') === 'on',
        sort_order: String(fd.get('sort_order') ?? '0'),
        old_price: String(fd.get('old_price') ?? ''),
        badge: String(fd.get('badge') ?? '')
      };
      const valid = productSchema.safeParse(body);
      if (!valid.success) {
        const flat = valid.error.flatten();
        const fe: Errors = {};
        for (const [k, v] of Object.entries(flat.fieldErrors)) if (v && v.length) fe[k] = v[0];
        setErrors(fe);
        setBusy(false);
        return;
      }
      setErrors({});
      const url = isEdit ? `/api/admin/products/${initial.id}` : '/api/admin/products';
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
      router.push('/products');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Błąd.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-neutral-400">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            {preview ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
          </button>
          {errors.image && <p className="mt-1 text-xs text-red-600">{errors.image}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa" error={errors.name}>
          <input
            name="name"
            type="text"
            required
            defaultValue={initial.name}
            className={inputClass}
            placeholder="np. Mleko 3,2% 1l"
          />
        </Field>
        <Field label="Marka (opcjonalnie)" error={errors.brand}>
          <input name="brand" type="text" defaultValue={initial.brand} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Kategoria" error={errors.category_id}>
          <select
            name="category_id"
            defaultValue={initial.category_id ?? ''}
            className={inputClass}
          >
            <option value="">— brak —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jednostka" error={errors.unit}>
          <select name="unit" defaultValue={initial.unit} className={inputClass}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cena orientacyjna (zł)" error={errors.estimated_price}>
          <input
            name="estimated_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={String(initial.estimated_price)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Cena przed (opcjonalnie)"
          error={errors.old_price}
          hint="Cena sprzed promocji — pokazywana przekreślona, zniżka liczona automatycznie."
        >
          <input
            name="old_price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial.old_price === '' ? '' : String(initial.old_price)}
            className={inputClass}
            placeholder="np. 4,99"
          />
        </Field>
        <Field label="Plakietka" error={errors.badge}>
          <select name="badge" defaultValue={initial.badge} className={inputClass}>
            <option value="">— brak —</option>
            <option value="hit">Hit</option>
            <option value="promo">Promocja</option>
          </select>
        </Field>
      </div>

      <Field label="Kolejność" error={errors.sort_order}>
        <input
          name="sort_order"
          type="number"
          min={0}
          step={1}
          defaultValue={String(initial.sort_order)}
          className={`${inputClass} max-w-[8rem]`}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={initial.is_active}
          className="h-4 w-4 accent-orange-600"
        />
        Produkt dostępny (widoczny w sklepie)
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
        className="w-full rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
      >
        {busy ? 'Zapisuję…' : isEdit ? 'Zapisz zmiany' : 'Dodaj produkt'}
      </button>
    </form>
  );
}
