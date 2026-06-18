'use client';

// Email + password registration. Replaces the old magic-link flow: the resident
// chooses a password here, so later logins use email+password (see PasswordLogin).
// The phone number is still verified exactly once, later, at
// /rejestracja/uzupelnij — the home gate sends unverified users there.
//
// emailRedirectTo uses the CURRENT origin (window.location.origin), not a fixed
// APP_URL — same reasoning as OAuthButtons: the confirmation link must return to
// the origin where signup started, or the session cookie lands on the wrong host.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordSchema } from '@/lib/utils/validators';

export default function EmailPasswordRegister() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const pw = passwordSchema.safeParse(password);
    if (!pw.success) {
      setError(pw.error.issues[0]?.message ?? 'Sprawdź hasło.');
      return;
    }
    if (password !== confirm) {
      setError('Hasła nie są takie same.');
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.jokus.pl';

    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${origin}/callback?next=/home` }
    });

    if (signErr) {
      setError('Nie udało się założyć konta. Sprawdź dane i spróbuj ponownie.');
      setBusy(false);
      return;
    }

    // Email confirmation disabled → signUp returns a live session immediately.
    if (data.session) {
      router.push('/home');
      router.refresh();
      return;
    }

    // Email confirmation enabled (default) → the user must click the link first.
    setSentTo(email.trim());
    setBusy(false);
  }

  if (sentTo) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
        Sprawdź skrzynkę — potwierdź adres <span className="font-semibold">{sentTo}</span>, aby
        dokończyć zakładanie konta.
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
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Hasło (min. 8 znaków)"
        autoComplete="new-password"
        aria-label="Hasło"
        className={inputClass}
      />
      <input
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Powtórz hasło"
        autoComplete="new-password"
        aria-label="Powtórz hasło"
        className={inputClass}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? 'Zakładam konto…' : 'Załóż konto'}
      </button>
    </form>
  );
}
