'use client';

// Email + password sign-in. Added mainly so payment providers / reviewers
// (e.g. Przelewy24) can log in with test credentials without a Google account.
// Uses Supabase signInWithPassword; the @supabase/ssr browser client persists
// the session in cookies, so server components pick it up after the redirect.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import TurnstileWidget, {
  resetTurnstile,
  turnstileConfigured
} from '@/components/shared/TurnstileWidget';

export default function PasswordLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken: captchaToken ?? undefined }
    });
    if (signErr) {
      // Log the REAL error (permanent): the generic message hid "is it the
      // password or the captcha?" — same lesson as /sklep and the address 500.
      console.error('[PasswordLogin] signInWithPassword failed', {
        code: (signErr as { code?: string }).code,
        message: signErr.message,
        status: (signErr as { status?: number }).status
      });
      const isCaptcha =
        (signErr as { code?: string }).code === 'captcha_failed' ||
        /captcha/i.test(signErr.message ?? '');
      setError(
        isCaptcha
          ? 'Weryfikacja antybotowa nie powiodła się, spróbuj ponownie.'
          : 'Nieprawidłowy e-mail lub hasło.'
      );
      // Turnstile tokens are single-use — demand a fresh challenge.
      setCaptchaToken(null);
      resetTurnstile();
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
        placeholder="Hasło"
        autoComplete="current-password"
        aria-label="Hasło"
        className={inputClass}
      />
      <TurnstileWidget onToken={setCaptchaToken} />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? 'Loguję…' : 'Zaloguj się e-mailem'}
      </button>
    </form>
  );
}
