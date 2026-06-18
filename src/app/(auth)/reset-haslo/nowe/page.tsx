// /reset-haslo/nowe — set a new password after clicking the recovery link.
//
// The recovery link goes through /callback (type=recovery), which verifies the
// token and sets a session before forwarding here. So a valid session is the
// proof the link was genuine: no session → the link expired or was tampered
// with, and we show an error instead of the form.

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SetNewPassword from '@/components/shared/SetNewPassword';

export default async function SetNewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <header>
          <h1 className="text-2xl font-bold">Link wygasł lub jest nieprawidłowy</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Poproś o nowy link do zmiany hasła i spróbuj ponownie.
          </p>
        </header>
        <Link
          href="/reset-haslo"
          className="mx-auto rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Wyślij nowy link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Ustaw nowe hasło</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Wpisz nowe hasło do swojego konta JOKUS.
        </p>
      </header>

      <SetNewPassword />
    </div>
  );
}
