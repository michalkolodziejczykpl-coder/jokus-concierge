// Resident home — Phase 1 "coś na ekranie" sprint.
// Server Component: resolves the session and resident's display name on the
// server, then hands off to the client-side <ModuleGrid /> for catalog fetch.
//
// The voice entry point (large mic button) is intentionally deferred — it
// will live next to the greeting once the Whisper edge function lands.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, ClipboardCheck, ShoppingBag } from 'lucide-react';
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
  const role = (profile as { role?: string } | null)?.role;
  if (role === 'jokusor') {
    redirect('/dashboard');
  }
  const isAdmin = role === 'admin';

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

      {isAdmin && (
        <section className="mb-8">
          <Link
            href="/jokusors"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/30 dark:hover:border-orange-700"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-600 text-white">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Zgłoszenia jokusorów
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Panel administratora — weryfikacja i akceptacja kandydatów.
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-orange-700 group-hover:underline dark:text-orange-400">
              Otwórz →
            </span>
          </Link>
        </section>
      )}

      <ModuleGrid />

      <section className="mt-10">
        <Link
          href="/marketplace"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-700 dark:hover:bg-orange-950/30"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Marketplace osiedlowy
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Kup od sąsiadów — z dostawą jokusora pod drzwi.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-orange-600 group-hover:underline dark:text-orange-400">
            Przeglądaj →
          </span>
        </Link>
      </section>

      <section className="mt-4">
        <Link
          href="/zostan-jokusorem"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-700 dark:hover:bg-orange-950/30"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Zostań jokusorem
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Realizuj zlecenia sąsiadów i zarabiaj w elastycznych godzinach.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-orange-600 group-hover:underline dark:text-orange-400">
            Dowiedz się →
          </span>
        </Link>
      </section>

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
