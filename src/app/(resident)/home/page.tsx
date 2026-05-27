// Resident home — Phase 1 "coś na ekranie" sprint.
// Server Component: resolves the session and resident's display name on the
// server, then hands off to the client-side <ModuleGrid /> for catalog fetch.
//
// The voice entry point (large mic button) is intentionally deferred — it
// will live next to the greeting once the Whisper edge function lands.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ModuleGrid } from '@/components/resident/ModuleGrid';

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

  // Role gate: send jokusors to their dashboard instead of the resident catalog
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role === 'jokusor') {
    redirect('/dashboard');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    (user.user_metadata?.name as string | undefined)?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    'mieszkańcu';

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Cześć, {displayName}
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          W czym możemy pomóc?
        </p>
      </header>

      <ModuleGrid />

      <footer className="mt-16 flex items-center justify-between border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
        <span>{user.email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            Wyloguj się
          </button>
        </form>
      </footer>
    </main>
  );
}
