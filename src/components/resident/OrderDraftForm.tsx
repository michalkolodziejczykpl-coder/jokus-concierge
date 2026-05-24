'use client';

// Renders a module's `custom_fields` as a dynamic form. The Zod schema is
// built lazily from the module's declarations (see `customFieldsToZodSchema`),
// so adding a new field type in the DB seed is a one-place change.
//
// On submit, POSTs to /api/orders/draft. On success, navigates to
// /orders/[id]/slots — that's the next step in the "tile → form → slot →
// pay" path (slot picker lands next sprint).

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { customFieldsToZodSchema } from '@/lib/utils/validators';
import type { CustomField, Module } from '@/lib/types/modules';

type Values = Record<string, string>;

export function OrderDraftForm({ module: moduleData }: { module: Module }) {
  const router = useRouter();

  // Build the schema once per module instance — the fields don't change
  // during the page lifetime, so memo is enough (no need to put it in state).
  const schema = useMemo(
    () => customFieldsToZodSchema(moduleData.custom_fields),
    [moduleData.custom_fields]
  );

  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(moduleData.custom_fields.map((f) => [f.key, '']))
  );
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: string, value: string) {
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

    const parsed = schema.safeParse(values);
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
      const res = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleData.id,
          custom_data: parsed.data,
          notes: notes.trim() || undefined
        })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(
          data.error ? `Błąd: ${data.error}` : `Nie udało się zapisać (${res.status})`
        );
        return;
      }

      const { id } = (await res.json()) as { id: string };
      router.push(`/orders/${id}/slots`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Błąd sieci');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {moduleData.custom_fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          error={fieldErrors[field.key]}
          onChange={(v) => update(field.key, v)}
        />
      ))}

      <Field label="Dodatkowe uwagi (opcjonalnie)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="np. dzwonek nie działa, proszę zapukać"
          className={inputClass}
        />
      </Field>

      {moduleData.requires_age_verification && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Ten moduł wymaga weryfikacji wieku przy dostawie (18+).
        </p>
      )}

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
        {submitting ? 'Zapisuję draft…' : 'Dalej — wybierz termin'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  value,
  error,
  onChange
}: {
  field: CustomField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={field.label} required={field.required} error={error}>
      {field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Wybierz…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : field.type === 'photo' ? (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL zdjęcia (upload dostępny w pełnej wersji)"
          className={inputClass}
        />
      ) : (
        // text — single-line input; multiline content goes through "notes"
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </Field>
  );
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

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
        <span className="block text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  );
}
