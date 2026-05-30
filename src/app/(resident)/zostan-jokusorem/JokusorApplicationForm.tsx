'use client';

// Jokusor application form.
// 1. Uploads documents to the PRIVATE jokusor-documents bucket under {uid}/...
//    (background check is mandatory; OC insurance optional). We keep the object
//    PATH, not a public URL — admins read via signed URLs.
// 2. POSTs the metadata + paths to /api/jokusor/apply.
// 3. On success → /zostan-jokusorem refreshes into the "pending" state.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, ShieldCheck, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { jokusorApplicationSchema } from '@/lib/utils/validators';

const BUCKET = 'jokusor-documents';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = 'image/*,application/pdf';

type Estate = { id: string; name: string };
type Props = { estates: Estate[]; userId: string };
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
      {hint && !error && (
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-500">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export default function JokusorApplicationForm({ estates, userId }: Props) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [ocFile, setOcFile] = useState<File | null>(null);

  function pickFile(
    setter: (f: File | null) => void,
    key: string
  ): (e: React.ChangeEvent<HTMLInputElement>) => void {
    return (e) => {
      const f = e.target.files?.[0] ?? null;
      if (f && f.size > MAX_FILE_BYTES) {
        setErrors((prev) => ({ ...prev, [key]: 'Plik większy niż 10 MB' }));
        setter(null);
        e.target.value = '';
        return;
      }
      setErrors((prev) => {
        const { [key]: _drop, ...rest } = prev;
        return rest;
      });
      setter(f);
    };
  }

  async function uploadDoc(file: File, kind: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const path = `${userId}/${Date.now()}-${kind}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Nie udało się wgrać dokumentu (${kind}): ${error.message}`);
    return path;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(e.currentTarget);
    const postalRaw = String(fd.get('service_postal_codes') ?? '');
    const postalCodes = postalRaw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!bgFile) {
      setErrors((prev) => ({
        ...prev,
        background_check_url: 'Wymagane zaświadczenie o niekaralności'
      }));
      return;
    }

    setBusy(true);
    setServerError(null);
    setErrors({});

    try {
      const bgPath = await uploadDoc(bgFile, 'background-check');
      const ocPath = ocFile ? await uploadDoc(ocFile, 'insurance-oc') : '';

      const body = {
        estate_id: String(fd.get('estate_id') ?? ''),
        service_postal_codes: postalCodes,
        bio: String(fd.get('bio') ?? '').trim(),
        business_name: String(fd.get('business_name') ?? '').trim(),
        nip: String(fd.get('nip') ?? '').trim(),
        bank_account: String(fd.get('bank_account') ?? '').trim(),
        background_check_url: bgPath,
        insurance_doc_url: ocPath
      };

      const valid = jokusorApplicationSchema.safeParse(body);
      if (!valid.success) {
        const flat = valid.error.flatten();
        const fieldErrors: Errors = {};
        for (const [k, v] of Object.entries(flat.fieldErrors)) {
          if (v && v.length > 0) fieldErrors[k] = v[0];
        }
        setErrors(fieldErrors);
        setBusy(false);
        return;
      }

      const res = await fetch('/api/jokusor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setServerError(
          data.message ?? `Nie udało się wysłać zgłoszenia (${data.error ?? res.status}).`
        );
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error('[JokusorApplicationForm.submit]', err);
      setServerError(err instanceof Error ? err.message : 'Błąd. Spróbuj ponownie.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Osiedle, na którym chcesz działać" error={errors.estate_id}>
        <select name="estate_id" required defaultValue="" className={inputClass}>
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

      <Field
        label="Kody pocztowe Twojego obszaru"
        error={errors.service_postal_codes}
        hint="Oddziel przecinkami lub spacjami, np. 54-129, 54-130"
      >
        <input
          name="service_postal_codes"
          type="text"
          required
          placeholder="54-129, 54-130"
          className={inputClass}
        />
      </Field>

      <Field
        label="O Tobie (opcjonalnie)"
        error={errors.bio}
        hint="Krótko — doświadczenie, dyspozycyjność"
      >
        <textarea name="bio" rows={3} maxLength={1000} className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nazwa firmy (opcjonalnie)" error={errors.business_name}>
          <input name="business_name" type="text" maxLength={160} className={inputClass} />
        </Field>
        <Field label="NIP (opcjonalnie)" error={errors.nip} hint="10 cyfr">
          <input name="nip" type="text" inputMode="numeric" className={inputClass} />
        </Field>
      </div>

      <Field label="Numer konta do wypłat (opcjonalnie)" error={errors.bank_account}>
        <input name="bank_account" type="text" maxLength={40} className={inputClass} />
      </Field>

      <fieldset className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Dokumenty
        </legend>

        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Zaświadczenie o niekaralności <span className="text-red-600">*</span>
          </p>
          <p className="mb-2 text-xs text-neutral-500">
            Wymagane — dbamy o bezpieczeństwo i renomę. PDF lub zdjęcie, do 10 MB.
          </p>
          <FileRow
            file={bgFile}
            onPick={pickFile(setBgFile, 'background_check_url')}
            onClear={() => setBgFile(null)}
            label="Dodaj zaświadczenie"
          />
          {errors.background_check_url && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.background_check_url}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Polisa OC (opcjonalnie)
          </p>
          <p className="mb-2 text-xs text-neutral-500">PDF lub zdjęcie, do 10 MB.</p>
          <FileRow
            file={ocFile}
            onPick={pickFile(setOcFile, 'insurance_doc_url')}
            onClear={() => setOcFile(null)}
            label="Dodaj polisę"
          />
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

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Wysyłam zgłoszenie…' : 'Wyślij zgłoszenie'}
      </button>
    </form>
  );
}

function FileRow({
  file,
  onPick,
  onClear,
  label
}: {
  file: File | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center gap-3">
      {file ? (
        <span className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-200">
          <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-[12rem] truncate">{file.name}</span>
          <button type="button" onClick={onClear} aria-label="Usuń plik">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-orange-400 hover:text-orange-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      )}
      <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
    </div>
  );
}
