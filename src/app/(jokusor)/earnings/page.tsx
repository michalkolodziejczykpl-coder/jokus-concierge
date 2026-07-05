// /earnings — jokusor earnings statement for a calendar month (audit rec #8).
//
// Billing v2 (owner-confirmed 2026-07-05; see migration 20260706000001):
//   * Only orders with status='completed' count; cancelled pay nothing.
//   * The SERVICE PRICE of an order is the FROZEN orders.base_price persisted
//     at checkout (for grocery: max(min, %×basket) computed then; for fixed
//     modules: the module price at order time). We deliberately do NOT
//     recompute from order_items here — closed months must not change when
//     the admin edits the rate/minimum later.
//   * The jokusor earns payout_share (default 50%) of each service price.
//   * Tips are 100% the jokusor's; subscription (default 0) is a period cost.
//   * JOKUS collects payments via P24 and pays out: payout = Σ share + tips −
//     subscription. Product costs (basket) are reimbursement, not earnings.
//   * Statement only — no invoices here (separate stage). Payments are still
//     MOCK, hence the permanent test-data badge until P24 ships.
//
// Month boundaries follow Europe/Warsaw: we fetch with a ±2-day margin and
// bucket precisely via dayKey() (Warsaw-pinned), so orders completed around
// midnight at a month edge land in the right statement.
//
// All money math is done in grosze (integers); rounding rules live in
// lib/payments/pricing.ts.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, FlaskConical, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN, formatDate, dayKey } from '@/lib/utils/formatters';
import { toGr, jokusorShareGr } from '@/lib/payments/pricing';

type PageProps = { searchParams: Promise<{ m?: string }> };

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Owner-confirmed defaults, used only when migration 20260706000001 is not
// applied yet (flagged on-page — never silently).
const DEFAULT_PAYOUT_SHARE = 0.5;
const DEFAULT_SUBSCRIPTION_GR = 0;

type BillingConfig = {
  // Optional defensively (e.g. a fresh environment before the billing
  // migration) — the on-page banner flags that state; prod has the column.
  payout_share?: number;
  subscription_amount: number | null;
};

type CompletedOrder = {
  id: string;
  base_price: number;
  total_price: number;
  completed_at: string;
  modules: { name: string } | null;
};

type TipRow = { order_id: string; amount: number; created_at: string };

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABEL_FMT = new Intl.DateTimeFormat('pl-PL', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Warsaw'
});

export default async function EarningsPage({ searchParams }: PageProps) {
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
  if ((profile as { role?: string } | null)?.role !== 'jokusor') redirect('/home');

  const { m } = await searchParams;
  const currentYm = dayKey(new Date().toISOString()).slice(0, 7);
  const ym = m && YM_RE.test(m) ? m : currentYm;

  // Fetch window: the month ± 2 days (UTC), then bucket precisely by Warsaw day.
  const [y, mon] = ym.split('-').map(Number);
  const windowStart = new Date(Date.UTC(y, mon - 1, 1) - 2 * 86_400_000).toISOString();
  const windowEnd = new Date(Date.UTC(y, mon, 1) + 2 * 86_400_000).toISOString();

  const [{ data: jokRow }, { data: orderRows, error: oErr }, { data: tipRows, error: tErr }] =
    await Promise.all([
      supabase
        .from('jokusors')
        .select('payout_share, subscription_amount')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, base_price, total_price, completed_at, modules(name)')
        .eq('jokusor_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', windowStart)
        .lt('completed_at', windowEnd)
        .order('completed_at', { ascending: false }),
      supabase
        .from('tips')
        .select('order_id, amount, created_at')
        .eq('jokusor_id', user.id)
        .eq('payment_status', 'paid')
        .gte('created_at', windowStart)
        .lt('created_at', windowEnd)
    ]);

  if (oErr || tErr) {
    console.error('[/earnings] fetch', oErr ?? tErr);
    throw new Error('Nie udało się załadować zestawienia zarobków');
  }

  const billing = jokRow as BillingConfig | null;
  const migrationMissing = billing !== null && billing.payout_share === undefined;

  const payoutShare = billing?.payout_share ?? DEFAULT_PAYOUT_SHARE;
  const subscriptionGr =
    billing?.subscription_amount != null
      ? toGr(billing.subscription_amount)
      : DEFAULT_SUBSCRIPTION_GR;

  // Bucket to the requested Warsaw-local month.
  const orders = ((orderRows as CompletedOrder[] | null) ?? []).filter((o) =>
    dayKey(o.completed_at).startsWith(ym)
  );
  const tips = ((tipRows as TipRow[] | null) ?? []).filter((t) =>
    dayKey(t.created_at).startsWith(ym)
  );

  const tipsByOrder = new Map<string, number>();
  for (const t of tips) {
    tipsByOrder.set(t.order_id, (tipsByOrder.get(t.order_id) ?? 0) + toGr(t.amount));
  }

  // Frozen service price per order = orders.base_price; jokusor share on top.
  const feeGr = (o: CompletedOrder) => toGr(o.base_price);
  const shareGr = (o: CompletedOrder) => jokusorShareGr(feeGr(o), payoutShare);
  // For grocery orders total = fee + basket, so the basket is derivable from
  // the two persisted columns (display only — not part of earnings).
  const basketGr = (o: CompletedOrder) => Math.max(0, toGr(o.total_price) - feeGr(o));

  const feesGr = orders.reduce((sum, o) => sum + feeGr(o), 0);
  const sharesGr = orders.reduce((sum, o) => sum + shareGr(o), 0);
  const tipsGr = tips.reduce((sum, t) => sum + toGr(t.amount), 0);
  const payoutGr = sharesGr + tipsGr - subscriptionGr;

  const monthLabel = MONTH_LABEL_FMT.format(new Date(`${ym}-15T12:00:00Z`));
  const prevYm = shiftMonth(ym, -1);
  const nextYm = shiftMonth(ym, 1);
  const showNext = nextYm <= currentYm;

  const fmt = (gr: number) => formatPLN(gr / 100);
  const sharePctLabel = (payoutShare * 100).toLocaleString('pl-PL');

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Twoje zlecenia
      </Link>

      <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Zarobki
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/earnings?m=${prevYm}`}
            aria-label="Poprzedni miesiąc"
            className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold capitalize text-neutral-800 dark:text-neutral-200">
            {monthLabel}
          </span>
          {showNext ? (
            <Link
              href={`/earnings?m=${nextYm}`}
              aria-label="Następny miesiąc"
              className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 p-1.5 text-neutral-300 dark:border-neutral-800 dark:text-neutral-700">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      </header>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Dane testowe</span> — do czasu uruchomienia płatności
          Przelewy24 zamówienia są opłacane w trybie testowym i kwoty poniżej nie odpowiadają
          realnym przepływom pieniędzy.
        </p>
      </div>

      {migrationMissing && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Konfiguracja rozliczeń nie jest jeszcze wdrożona (migracja 20260706000001) — poniżej
            wartości domyślne: udział 50%, abonament 0 zł.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">
              Cena usług — {orders.length}{' '}
              {orders.length === 1 ? 'zlecenie ukończone' : 'zleceń ukończonych'}
            </dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">{fmt(feesGr)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">
              Twój udział ({sharePctLabel}% ceny usługi)
            </dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">+{fmt(sharesGr)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">Napiwki (100% dla Ciebie)</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">+{fmt(tipsGr)}</dd>
          </div>
          {subscriptionGr > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Abonament (miesiąc)</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                −{fmt(subscriptionGr)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
            <dt className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {payoutGr >= 0 ? 'Do wypłaty' : 'Saldo okresu (ujemne)'}
            </dt>
            <dd
              className={`text-base font-bold ${
                payoutGr >= 0
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {fmt(payoutGr)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
          Ceny usług są zamrożone z chwili zamówienia — późniejsze zmiany cennika nie zmieniają
          zamkniętych miesięcy. Zwrot kosztów produktów (koszyk) nie jest częścią zarobku.
          Zestawienie ma charakter informacyjny — nie jest fakturą ani wezwaniem do zapłaty.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Zlecenia w tym okresie
        </h2>
        {orders.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak ukończonych zleceń w tym miesiącu.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {orders.map((o) => {
              const tipGr = tipsByOrder.get(o.id) ?? 0;
              const basket = basketGr(o);
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {o.modules?.name ?? 'Zlecenie'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      {formatDate(o.completed_at)}
                      {basket > 0 ? ` · koszyk ${fmt(basket)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      +{fmt(shareGr(o) + tipGr)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      cena usługi {fmt(feeGr(o))} · udział +{fmt(shareGr(o))}
                      {tipGr > 0 ? ` · napiwek +${fmt(tipGr)}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
