// /zostan-jokusorem — become a jokusor.
// States:
//   - already jokusor        → /dashboard
//   - has a jokusors row      → show application status (pending review / rejected)
//   - otherwise               → show the application form

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import JokusorApplicationForm from './JokusorApplicationForm';

type Estate = { id: string; name: string };
type JokusorRow = { onboarding_status: string; is_active: boolean };

export default async function BecomeJokusorPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role === 'jokusor') {
    redirect('/dashboard');
  }

  const { data: appRow } = await supabase
    .from('jokusors')
    .select('onboarding_status, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  const application = appRow as JokusorRow | null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Zostań jokusorem
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Realizuj zlecenia sąsiadów na swoim osiedlu i zarabiaj w elastycznych godzinach.
        </p>
      </header>

      {application ? (
        application.onboarding_status === 'rejected' ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
            <XCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div className="text-sm text-red-900 dark:text-red-200">
              <p className="font-semibold">Zgłoszenie odrzucone</p>
              <p className="mt-1">
                Twoje zgłoszenie nie zostało zaakceptowane. W razie pytań napisz na adres podany w
                stopce serwisu.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
            <Clock
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Zgłoszenie w trakcie weryfikacji</p>
              <p className="mt-1">
                Dziękujemy! Sprawdzamy Twoje dokumenty, w tym zaświadczenie o niekaralności. Damy
                znać, gdy konto jokusora będzie gotowe.
              </p>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
            <p>
              Każde zgłoszenie weryfikujemy ręcznie — wymagamy zaświadczenia o niekaralności. To
              buduje zaufanie sąsiadów i renomę JOKUS.
            </p>
          </div>
          <div className="mt-8">
            <JokusorApplicationForm estates={(await fetchEstates()) as Estate[]} userId={user.id} />
          </div>
        </>
      )}
    </main>
  );

  async function fetchEstates() {
    const { data } = await supabase.from('estates').select('id, name').order('name');
    return (data as Estate[] | null) ?? [];
  }
}
