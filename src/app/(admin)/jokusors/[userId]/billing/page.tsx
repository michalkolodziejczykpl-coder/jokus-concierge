// /jokusors/[userId]/billing — admin edits one jokusor's billing (v3):
// optional payout-share EXCEPTION (empty = the general fee_config rule, 80%
// as of 2026-07-21) + monthly subscription. Admin-gated like the other
// (admin) pages. Reads via the server client (RLS: jokusors_admin_all,
// fee_config_read_authenticated).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFeeConfig } from '@/lib/payments/feeConfig';
import JokusorBillingForm from '@/components/admin/JokusorBillingForm';

type PageProps = { params: Promise<{ userId: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JokusorBillingRow = {
  user_id: string;
  payout_share: number | null;
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

  const [{ data: jokRow }, { data: userRow }, feeConfig] = await Promise.all([
    supabase
      .from('jokusors')
      .select('user_id, payout_share, subscription_amount')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('users').select('full_name, email').eq('id', userId).maybeSingle(),
    getCurrentFeeConfig(supabase, 'consumer')
  ]);

  const jok = jokRow as JokusorBillingRow | null;
  const person = userRow as { full_name: string | null; email: string | null } | null;

  const defaultSharePercent =
    feeConfig !== null ? Math.round(feeConfig.jokusor_share * 10_000) / 100 : null;

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
          {defaultSharePercent === null && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Brak reguły ogólnej w <code>fee_config</code> (migracja 20260721000001 nie jest
                zastosowana lub tabela jest pusta). Do czasu jej uzupełnienia ustaw udział jawnie.
              </p>
            </div>
          )}

          <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <JokusorBillingForm
              userId={userId}
              defaultSharePercent={defaultSharePercent}
              initial={{
                payout_share_percent:
                  jok.payout_share == null ? null : Math.round(jok.payout_share * 10_000) / 100,
                subscription_amount: jok.subscription_amount ?? 0
              }}
            />
          </section>
        </>
      )}
    </main>
  );
}
