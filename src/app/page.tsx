// Public landing page (unauthenticated entry point).
// Authenticated users get redirected to their role-appropriate home in middleware.

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">MIGMIG Concierge</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Twoje osiedlowe usługi w jednej aplikacji — zakupy, paczki, pies, fachowiec, marketplace.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-600"
        >
          Zaloguj się
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-neutral-300 px-6 py-3 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Załóż konto
        </Link>
      </div>

      <p className="text-xs text-neutral-500">JOKUS Sp. z o.o. · Wrocław · NIP 9131639730</p>
    </main>
  );
}
