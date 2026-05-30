'use client';

// Jokusor profile: name, phone, bio, service area, business data + public photo.
// Photo uploads to the PUBLIC jokusor-photos bucket; its public URL is saved.
// PATCH /api/jokusor/profile.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { jokusorProfileSchema } from '@/lib/utils/validators';

const BUCKET = 'jokusor-photos';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Initial = {
  full_name: string;
  phone: string;
  bio: string;
  service_postal_codes: string;
  business_name: string;
  nip: string;
  bank_account: string;
  public_photo_url: string;
};
type Errors = Record<string, string>;

const inputClass =
  'mt-0 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

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

export default function JokusorProfileForm({
  userId,
  initial
}: {
  userId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initial.public_photo_url);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErrors((p) => ({ ...p, photo: 'Tylko pliki graficzne' }));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setErrors((p) => ({ ...p, photo: 'Zdjęcie większe niż 5 MB' }));
      return;
    }
    setErrors((p) => {
      const { photo: _d, ...rest } = p;
      return rest;
    });
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function uploadPhoto(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;
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
    const postalCodes = String(fd.get('service_postal_codes') ?? '')
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    setServerError(null);
    setSaved(false);
    try {
      let photoUrl = initial.public_photo_url;
      if (photoFile) photoUrl = await uploadPhoto(photoFile);

      const body = {
        full_name: String(fd.get('full_name') ?? '').trim(),
        phone: String(fd.get('phone') ?? '').trim(),
        bio: String(fd.get('bio') ?? '').trim(),
        service_postal_codes: postalCodes,
        business_name: String(fd.get('business_name') ?? '').trim(),
        nip: String(fd.get('nip') ?? '').trim(),
        bank_account: String(fd.get('bank_account') ?? '').trim(),
        public_photo_url: photoUrl
      };

      const valid = jokusorProfileSchema.safeParse(body);
      if (!valid.success) {
        const flat = valid.error.flatten();
        const fe: Errors = {};
        for (const [k, v] of Object.entries(flat.fieldErrors)) if (v && v.length) fe[k] = v[0];
        setErrors(fe);
        setBusy(false);
        return;
      }
      setErrors({});

      const res = await fetch('/api/jokusor/profile', {
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
    } catch (err) {
      console.error('[JokusorProfileForm.submit]', err);
      setServerError(err instanceof Error ? err.message : 'Błąd. Spróbuj ponownie.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Zdjęcie jokusora" className="h-full w-full object-cover" />
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
            {photoPreview ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
          </button>
          <p className="mt-1 text-xs text-neutral-500">
            Widoczne dla mieszkańców na ich zamówieniu. Do 5 MB.
          </p>
          {errors.photo && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.photo}</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
      </div>

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
        <input name="phone" type="tel" defaultValue={initial.phone} className={inputClass} />
      </Field>
      <Field label="O mnie" error={errors.bio} hint="Krótki opis widoczny dla mieszkańców">
        <textarea
          name="bio"
          rows={3}
          maxLength={1000}
          defaultValue={initial.bio}
          className={inputClass}
        />
      </Field>
      <Field
        label="Kody pocztowe obszaru"
        error={errors.service_postal_codes}
        hint="Oddziel przecinkami, np. 54-129, 54-130"
      >
        <input
          name="service_postal_codes"
          type="text"
          required
          defaultValue={initial.service_postal_codes}
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa firmy" error={errors.business_name}>
          <input
            name="business_name"
            type="text"
            maxLength={160}
            defaultValue={initial.business_name}
            className={inputClass}
          />
        </Field>
        <Field label="NIP" error={errors.nip} hint="10 cyfr">
          <input
            name="nip"
            type="text"
            inputMode="numeric"
            defaultValue={initial.nip}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Numer konta do wypłat" error={errors.bank_account}>
        <input
          name="bank_account"
          type="text"
          maxLength={40}
          defaultValue={initial.bank_account}
          className={inputClass}
        />
      </Field>

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
