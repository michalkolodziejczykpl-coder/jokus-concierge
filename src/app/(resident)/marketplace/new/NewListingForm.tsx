'use client';

// Listing creation form. Submits to POST /api/marketplace/listings.
// Photo upload flow:
//   1. User selects up to 3 image files.
//   2. On submit we first upload each file to the `marketplace-listings`
//      bucket under `{user_id}/{timestamp}-{n}.{ext}` — RLS gates so a user
//      can only write to their own folder.
//   3. Public URLs of the uploaded files are sent in the listing POST body.
//   4. On success → redirect to /marketplace/[id].

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createListingSchema } from '@/lib/utils/validators';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  DELIVERY_OPTION_LABELS,
  type PickupAddress
} from '@/lib/types/marketplace';

const MAX_PHOTOS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'marketplace-listings';

type Props = {
  prefillPickup: PickupAddress;
  userId: string;
};

type Errors = Record<string, string>;

type LocalPhoto = {
  file: File;
  previewUrl: string;
};

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
      {hint && !error && (
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-500">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600';

export default function NewListingForm({ prefillPickup, userId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function addFiles(filesList: FileList | null) {
    if (!filesList) return;
    const incoming = Array.from(filesList);
    const accepted: LocalPhoto[] = [];
    let sizeError = false;
    let typeError = false;
    for (const f of incoming) {
      if (photos.length + accepted.length >= MAX_PHOTOS) break;
      if (!f.type.startsWith('image/')) {
        typeError = true;
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        sizeError = true;
        continue;
      }
      accepted.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }
    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }
    if (sizeError) {
      setErrors((e) => ({ ...e, photos: 'Pominięto zdjęcia ponad 5 MB' }));
    } else if (typeError) {
      setErrors((e) => ({ ...e, photos: 'Tylko pliki graficzne (image/*)' }));
    } else {
      setErrors((e) => {
        const { photos: _drop, ...rest } = e;
        return rest;
      });
    }
    // Allow re-selecting the same file later
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return [];
    const supabase = createClient();
    const urls: string[] = [];
    const stamp = Date.now();
    for (let i = 0; i < photos.length; i += 1) {
      const p = photos[i];
      const ext = (p.file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${stamp}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, p.file, { contentType: p.file.type, upsert: false });
      if (error) {
        throw new Error(`Nie udało się wgrać zdjęcia ${i + 1}: ${error.message}`);
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(e.currentTarget);
    // Build payload WITHOUT photos first (we'll upload after primary validation).
    const baseBody = {
      title: String(fd.get('title') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      category: String(fd.get('category') ?? ''),
      price: String(fd.get('price') ?? ''),
      condition: String(fd.get('condition') ?? ''),
      delivery_option: String(fd.get('delivery_option') ?? 'migmig_or_pickup'),
      pickup_address: {
        street: String(fd.get('pickup_street') ?? '').trim(),
        building: String(fd.get('pickup_building') ?? '').trim(),
        apartment: String(fd.get('pickup_apartment') ?? '').trim() || null,
        city: String(fd.get('pickup_city') ?? '').trim(),
        postal_code: String(fd.get('pickup_postal') ?? '').trim()
      },
      photos: [] as string[]
    };

    const baseValid = createListingSchema.safeParse(baseBody);
    if (!baseValid.success) {
      const flat = baseValid.error.flatten();
      const fieldErrors: Errors = {};
      for (const [k, v] of Object.entries(flat.fieldErrors)) {
        if (v && v.length > 0) fieldErrors[k] = v[0];
      }
      setErrors(fieldErrors);
      setServerError(null);
      return;
    }
    setErrors({});

    setBusy(true);
    setServerError(null);

    try {
      // Upload photos to Storage first (fail fast if upload breaks)
      const photoUrls = await uploadPhotos();
      const finalBody = { ...baseValid.data, photos: photoUrls };

      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBody)
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setServerError(
          data.message ?? `Nie udało się dodać ogłoszenia (${data.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { id: string };
      router.push(`/marketplace/${data.id}`);
    } catch (err) {
      console.error('[NewListingForm.submit]', err);
      setServerError(err instanceof Error ? err.message : 'Błąd. Spróbuj ponownie.');
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
          placeholder="np. Rower dziecięcy 20 cali"
          className={inputClass}
        />
      </Field>

      <Field label="Opis" error={errors.description} hint="Opcjonalnie — max 2000 znaków">
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="Szczegóły, stan, powód sprzedaży..."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Kategoria" error={errors.category}>
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              — wybierz —
            </option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Stan" error={errors.condition}>
          <select name="condition" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              — wybierz —
            </option>
            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Cena (zł)" error={errors.price} hint="Min 5 zł, max 50 000 zł">
          <input
            name="price"
            type="number"
            min={5}
            max={50000}
            step={1}
            required
            placeholder="250"
            className={inputClass}
          />
        </Field>

        <Field label="Sposób przekazania" error={errors.delivery_option}>
          <select name="delivery_option" defaultValue="migmig_or_pickup" className={inputClass}>
            {Object.entries(DELIVERY_OPTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <legend className="px-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Skąd jokusor odbierze (lub kupujący przyjedzie)
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ulica" error={errors.pickup_address}>
            <input
              name="pickup_street"
              type="text"
              required
              defaultValue={prefillPickup.street}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nr">
              <input
                name="pickup_building"
                type="text"
                required
                defaultValue={prefillPickup.building}
                className={inputClass}
              />
            </Field>
            <Field label="Mieszk.">
              <input
                name="pickup_apartment"
                type="text"
                defaultValue={prefillPickup.apartment ?? ''}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Kod pocztowy">
            <input
              name="pickup_postal"
              type="text"
              required
              pattern="[0-9]{2}-[0-9]{3}"
              defaultValue={prefillPickup.postal_code}
              className={inputClass}
            />
          </Field>
          <Field label="Miasto">
            <input
              name="pickup_city"
              type="text"
              required
              defaultValue={prefillPickup.city}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Zdjęcia (opcjonalnie, max {MAX_PHOTOS}, do 5 MB każde)
        </legend>
        <div className="flex flex-wrap gap-3">
          {photos.map((p, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div
              key={p.previewUrl}
              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
            >
              <img
                src={p.previewUrl}
                alt={`Podgląd ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label={`Usuń zdjęcie ${idx + 1}`}
                className="absolute right-1 top-1 rounded-full bg-neutral-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 transition hover:border-orange-400 hover:text-orange-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-orange-500 dark:hover:text-orange-400"
            >
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">Dodaj</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {errors.photos && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.photos}</p>
        )}
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
        {busy ? 'Dodaję…' : 'Wystaw ogłoszenie'}
      </button>
    </form>
  );
}
