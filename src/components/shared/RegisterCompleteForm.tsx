'use client';

// Two-step finish of email registration:
//   1. 'profile' — full name + phone. Saves name+phone via /api/register/profile,
//      then asks Supabase to send an SMS code (updateUser({ phone })).
//   2. 'otp'     — 6-digit code. verifyOtp({ type: 'phone_change' }) on the
//      client, then /api/register/confirm-phone flips users.phone_verified
//      server-side (it re-checks phone_confirmed_at — never trusts us).
//
// When phoneOtpEnabled is false (no SMS provider yet) we save the profile but
// stop before the SMS step and show a notice — phone_verified stays false.
// TODO: remove the disabled branch once a Supabase SMS provider is live.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerProfileSchema } from '@/lib/utils/validators';

type Step = 'profile' | 'otp' | 'otp_disabled';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';
const buttonClass =
  'rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200';

export default function RegisterCompleteForm({
  initialFullName,
  phoneOtpEnabled
}: {
  initialFullName: string;
  phoneOtpEnabled: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('profile');
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Step 1: name + phone ------------------------------------------------
  async function onSubmitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const parsed = registerProfileSchema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? 'Sprawdź wprowadzone dane.';
      setError(first);
      return;
    }
    const { full_name, phone: cleanPhone } = parsed.data;
    setBusy(true);

    const res = await fetch('/api/register/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone: cleanPhone })
    });
    if (!res.ok) {
      setError('Nie udało się zapisać danych. Spróbuj ponownie.');
      setBusy(false);
      return;
    }

    setNormalizedPhone(cleanPhone);

    // No SMS provider configured — stop here, phone stays unverified.
    if (!phoneOtpEnabled) {
      setStep('otp_disabled');
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: smsErr } = await supabase.auth.updateUser({ phone: cleanPhone });
    if (smsErr) {
      setError('Nie udało się wysłać kodu SMS. Sprawdź numer i spróbuj ponownie.');
      setBusy(false);
      return;
    }

    setStep('otp');
    setBusy(false);
  }

  // --- Step 2: SMS code ----------------------------------------------------
  async function onSubmitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: code.trim(),
      type: 'phone_change'
    });
    if (verifyErr) {
      setError('Nieprawidłowy lub nieaktualny kod. Spróbuj ponownie.');
      setBusy(false);
      return;
    }

    // Server-side flip of phone_verified (re-checks phone_confirmed_at).
    const res = await fetch('/api/register/confirm-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizedPhone })
    });
    if (!res.ok) {
      setError('Telefon potwierdzony, ale nie udało się dokończyć. Odśwież i spróbuj ponownie.');
      setBusy(false);
      return;
    }

    // Phone is verified → finish address onboarding (it self-skips to /home if
    // an address already exists).
    router.push('/onboarding/address');
    router.refresh();
  }

  async function resendCode() {
    if (busy) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: smsErr } = await supabase.auth.updateUser({ phone: normalizedPhone });
    if (smsErr) setError('Nie udało się wysłać kodu ponownie.');
    setBusy(false);
  }

  if (step === 'otp_disabled') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        Zapisaliśmy Twoje dane. Weryfikacja numeru telefonu kodem SMS jest chwilowo niedostępna —
        dokończymy ją, gdy tylko uruchomimy wysyłkę SMS. Możesz na razie korzystać z aplikacji.
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <form onSubmit={onSubmitOtp} className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Wysłaliśmy SMS z 6-cyfrowym kodem na numer <span className="font-semibold">{phone}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Kod z SMS"
          aria-label="Kod z SMS"
          className={inputClass}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy || code.length < 6} className={buttonClass}>
          {busy ? 'Sprawdzam…' : 'Potwierdź'}
        </button>
        <button
          type="button"
          onClick={resendCode}
          disabled={busy}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline disabled:opacity-50 dark:hover:text-neutral-200"
        >
          Wyślij kod ponownie
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitProfile} className="flex flex-col gap-3">
      <input
        type="text"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Imię i nazwisko"
        autoComplete="name"
        aria-label="Imię i nazwisko"
        className={inputClass}
      />
      <input
        type="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Numer telefonu (np. +48 600 700 800)"
        autoComplete="tel"
        aria-label="Numer telefonu"
        className={inputClass}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? 'Zapisuję…' : 'Dalej'}
      </button>
    </form>
  );
}
