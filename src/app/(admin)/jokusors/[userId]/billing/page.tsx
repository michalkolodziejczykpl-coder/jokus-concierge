// /jokusors/[userId]/billing — admin edits one jokusor's billing (v2):
// payout share (% of each order's service price) + monthly subscription.
// Admin-gated like the other (admin) pages. Reads via the server client
// (RLS: jokusors_admin_all).
//
// Resilient to the pending migration: if the payout_share column is missing
// (20260706000001 not applied yet), we show a warning and prefill defaults —
// saving will fail until the migration is applied.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import JokusorBillingForm from '@/components/admin/JokusorBillingForm';

type PageProps = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Owner-confirmed defaults (see migration 20260706000001).
const DEFAULT_PAYOUT_SHARE = 0.5;
const DEFAULT_SUBSCRIPTION = 0;

type JokusorBillingRow = {
  user_id: string;
  // Missing until migration 20260706000001 is applied:
  payout_share?: number;
  subscription_amount: number | null;
};

export default async function JokusorBillingPage({ params }: PageProps) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) redirect('/users');

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
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/home');

  const [{ data: jokRow }, { data: userRow }] = await Promise.all([
    supabase
      .from('jokusors')
      .select('user_id, payout_share, subscription_amount')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('users').select('full_name, email').eq('id', userId).maybeSingle()
  ]);

  const jok = jokRow as JokusorBillingRow | null;
  const person = userRow as { full_name: string | null; email: string | null } | null;

  const migrationMissing = jok !== null && jok.payout_share === undefined;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Użytkownicy
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Rozliczenia jokusora
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {person?.full_name || '—'} {person?.email ? `· ${person.email}` : ''}
      </p>

      {!jok ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          Ten użytkownik nie ma profilu jokusora.
        </div>
      ) : (
        <>
          {migrationMissing && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Migracja <code>20260706000001_jokusor_billing_fields.sql</code> nie jest jeszcze
                zastosowana — poniżej wartości domyślne, a zapis nie powiedzie się, dopóki jej nie
                zastosujesz.
              </p>
            </div>
          )}

          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <JokusorBillingForm
              userId={userId}
              initial={{
                payout_share_percent:
                  Math.round((jok.payout_share ?? DEFAULT_PAYOUT_SHARE) * 10_000) / 100,
                subscription_amount: jok.subscription_amount ?? DEFAULT_SUBSCRIPTION
              }}
            />
          </section>
        </>
      )}
    </main>
  );
}
