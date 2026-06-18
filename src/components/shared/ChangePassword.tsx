'use client';

// "Change password" section on /profile. Rendered only for accounts that have an
// email/password identity (see ProfilePage) — OAuth-only users manage their
// password with their provider, so the section is hidden for them.
//
// No current-password prompt: the user already holds an authenticated session,
// which is what Supabase's updateUser({ password }) requires.

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { passwordSchema } from '@/lib/utils/validators';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setDone(false);

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
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError('Nie udało się zmienić hasła. Spróbuj ponownie.');
      setBusy(false);
      return;
    }

    setPassword('');
    setConfirm('');
    setDone(true);
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Zmiana hasła
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Ustaw nowe hasło do logowania e-mailem.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Nowe hasło
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="min. 8 znaków"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Powtórz hasło
        </span>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {done && !error && (
        <p className="text-xs text-green-700 dark:text-green-400">Hasło zmienione.</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? 'Zapisuję…' : 'Zmień hasło'}
      </button>
    </form>
  );
}
