// /reset-haslo — request a password-reset link (email accounts only).
// Google/Facebook users have no password and don't reach this from the UI;
// if they land here, the neutral flow simply does nothing useful for them.

import Link from 'next/link';
import ResetPasswordRequest from '@/components/shared/ResetPasswordRequest';

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Nie pamiętasz hasła?</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Podaj adres e-mail konta — wyślemy link do ustawienia nowego hasła.
        </p>
      </header>

      <ResetPasswordRequest />

      <p className="text-center text-xs text-neutral-500">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
