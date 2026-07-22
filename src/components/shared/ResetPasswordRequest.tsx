'use client';

// Step 1 of password recovery (email accounts only). Sends a Supabase recovery
// link; the link lands on /callback?type=recovery&next=/reset-haslo/nowe, which
// verifies the token, sets a session, and forwards to the "set new password"
// screen.
//
// The confirmation message is intentionally NEUTRAL — it must not reveal whether
// an account exists for the given address (account-enumeration protection).
//
// redirectTo uses the CURRENT origin (window.location.origin) so the link
// returns to the host the request started on (jokus.pl AND migmig.pl).

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import TurnstileWidget, { turnstileConfigured } from '@/components/shared/TurnstileWidget';

export default function ResetPasswordRequest() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (turnstileConfigured && !captchaToken) {
      setError('Poczekaj na weryfikację antybotową i spróbuj ponownie.');
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.jokus.pl';

    // Ignore the error on purpose: surfacing it would leak whether the account
    // exists. Always show the same neutral confirmation.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/callback?next=/reset-haslo/nowe`,
      captchaToken: captchaToken ?? undefined
    });

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
        Jeśli konto istnieje, wysłaliśmy link do zmiany hasła. Sprawdź skrzynkę.
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
        aria-label="E-mail"
        className={inputClass}
      />
      <TurnstileWidget onToken={setCaptchaToken} />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? 'Wysyłam…' : 'Wyślij link do zmiany hasła'}
      </button>
    </form>
  );
}
