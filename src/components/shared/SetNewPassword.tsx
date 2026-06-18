'use client';

// Step 2 of password recovery: the recovery link already set a session (via
// /callback type=recovery), so here we just collect a new password and call
// updateUser({ password }). On success we land on /home (the home gate handles
// phone verification from there).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordSchema } from '@/lib/utils/validators';

export default function SetNewPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError('Nie udało się ustawić hasła. Link mógł wygasnąć — spróbuj ponownie.');
      setBusy(false);
      return;
    }

    router.push('/home');
    router.refresh();
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nowe hasło (min. 8 znaków)"
        autoComplete="new-password"
        aria-label="Nowe hasło"
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
        {busy ? 'Zapisuję…' : 'Ustaw nowe hasło'}
      </button>
    </form>
  );
}
