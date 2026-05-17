// Minimal placeholder home for logged-in residents.
// Phase 1 will replace this with the real tile grid + voice entry point.
// For now it just proves the OAuth round-trip works end-to-end.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function ResidentHomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    'mieszkańcu';

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Cześć, {displayName} 👋
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Logowanie działa. Panel mieszkańca powstanie w Fazie 1 (kafelki modułów, wpis głosowy, koszyk → BLIK).
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-4 text-left text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="font-medium">Sesja Supabase</p>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">user.id: {user.id}</p>
        <p className="text-neutral-600 dark:text-neutral-400">email: {user.email}</p>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Wyloguj się
        </button>
      </form>
    </main>
  );
}
