'use client';

// Passwordless email registration. The resident enters only their email; we
// send a Supabase magic link that, when clicked, creates the account + session
// and lands on /callback?next=/rejestracja/uzupelnij to finish the flow
// (name + verified phone). No password is collected here by design.
//
// emailRedirectTo uses the CURRENT origin (window.location.origin), not a fixed
// APP_URL — same reasoning as OAuthButtons: the PKCE cookie is set on the origin
// where the flow started, so the link must return to that same origin.

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MagicLinkRegister() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const trimmed = email.trim();
    const supabase = createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.jokus.pl';

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/callback?next=/rejestracja/uzupelnij`
      }
    });

    if (otpErr) {
      setError('Nie udało się wysłać linku. Sprawdź adres e-mail i spróbuj ponownie.');
      setBusy(false);
      return;
    }

    setSentTo(trimmed);
    setBusy(false);
  }

  if (sentTo) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
        Sprawdź skrzynkę — wysłaliśmy link aktywacyjny na{' '}
        <span className="font-semibold">{sentTo}</span>.
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
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? 'Wysyłam…' : 'Wyślij link aktywacyjny'}
      </button>
    </form>
  );
}
