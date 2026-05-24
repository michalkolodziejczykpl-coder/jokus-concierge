'use client';

// Onboarding: estate picker + address fields. Client component because we
// need form state + client-side validation + redirect-after-submit logic.
//
// On submit, POSTs to /api/onboarding/address. On success, navigates to the
// `next` URL the page received (or /home as a fallback).

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useEstates } from '@/hooks/useEstates';
import { addressInputSchema } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/cn';

type FormState = {
  estate_id: string;
  street: string;
  building: string;
  apartment: string;
  postal_code: string;
  city: string;
  notes: string;
};

const EMPTY: FormState = {
  estate_id: '',
  street: '',
  building: '',
  apartment: '',
  postal_code: '',
  city: 'Wrocław',
  notes: ''
};

export function AddressOnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const { data: estates, isLoading: estatesLoading, isError: estatesError } = useEstates();

  const [values, setValues] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = addressInputSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(flat)) {
        if (messages && messages.length > 0) mapped[key] = messages[0];
      }
      setFieldErrors(mapped);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(
          data.error === 'address_already_exists'
            ? 'Adres już istnieje. Przekierowuję…'
            : `Nie udało się zapisać adresu (${res.status})`
        );
        if (data.error === 'address_already_exists') {
          setTimeout(() => router.push(next), 800);
        }
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Błąd sieci');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Osiedle" error={fieldErrors.estate_id} required>
        <select
          value={values.estate_id}
          onChange={(e) => update('estate_id', e.target.value)}
          disabled={estatesLoading || estatesError}
          className={inputClass}
        >
          <option value="">
            {estatesLoading
              ? 'Ładowanie…'
              : estatesError
                ? 'Błąd ładowania osiedli'
                : 'Wybierz osiedle'}
          </option>
          {estates?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Ulica" error={fieldErrors.street} required>
          <input
            type="text"
            value={values.street}
            onChange={(e) => update('street', e.target.value)}
            placeholder="np. Powstańców Śląskich"
            className={inputClass}
            autoComplete="address-line1"
          />
        </Field>

        <Field label="Numer" error={fieldErrors.building} required>
          <input
            type="text"
            value={values.building}
            onChange={(e) => update('building', e.target.value)}
            placeholder="12A"
            className={inputClass}
          />
        </Field>

        <Field label="Mieszkanie" error={fieldErrors.apartment}>
          <input
            type="text"
            value={values.apartment}
            onChange={(e) => update('apartment', e.target.value)}
            placeholder="opcjonalnie"
            className={inputClass}
            autoComplete="address-line2"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_2fr]">
        <Field label="Kod pocztowy" error={fieldErrors.postal_code} required>
          <input
            type="text"
            value={values.postal_code}
            onChange={(e) => update('postal_code', e.target.value)}
            placeholder="50-077"
            inputMode="numeric"
            className={inputClass}
            autoComplete="postal-code"
          />
        </Field>

        <Field label="Miasto" error={fieldErrors.city} required>
          <input
            type="text"
            value={values.city}
            onChange={(e) => update('city', e.target.value)}
            className={inputClass}
            autoComplete="address-level2"
          />
        </Field>
      </div>

      <Field label="Notatka dla jokusora (opcjonalnie)" error={fieldErrors.notes}>
        <textarea
          value={values.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder='np. "klucze u sąsiada w 4B"'
          rows={2}
          className={inputClass}
        />
      </Field>

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Zapisuję…' : 'Zapisz adres'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Local primitives — keep co-located until we extract a real <Field /> in ui/.
// ---------------------------------------------------------------------------

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
        {required && <span className="ml-0.5 text-orange-600">*</span>}
      </span>
      {children}
      {error && (
        <span className={cn('block text-xs font-medium text-red-600 dark:text-red-400')}>
          {error}
        </span>
      )}
    </label>
  );
}
