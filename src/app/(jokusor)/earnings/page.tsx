// /earnings — jokusor earnings statement for a calendar month.
//
// Billing v3 (owner-confirmed 2026-07-21; see migration 20260721000001):
//   * Only orders with status='completed' count; cancelled pay nothing.
//   * The SERVICE PRICE of an order is the FROZEN orders.base_price persisted
//     at checkout; the jokusor's cut of it is the FROZEN
//     orders.jokusor_share_frozen persisted at payment time (effective share
//     = per-jokusor exception ?? fee_config general rule, 80% since
//     2026-07-21; historical orders carry the 50% they were settled at).
//     We deliberately do NOT recompute from order_items or current config —
//     closed months must not change when the admin edits terms later.
//   * Gastro courses (restaurant-paid) are listed separately: the jokusor
//     earns gastro_orders.fee × gastro_orders.jokusor_share_frozen, both
//     frozen when the course was logged.
//   * Tips are 100% the jokusor's; subscription (default 0) is a period cost.
//   * JOKUS collects payments via P24 and pays out: payout = Σ consumer
//     shares + Σ gastro shares + tips − subscription. Product costs (basket)
//     are reimbursement, not earnings.
//   * Statement only — no invoices here (separate stage). Consumer payments
//     are still MOCK, hence the test-data badge until P24 ships.
//
// Month boundaries follow Europe/Warsaw: we fetch with a ±2-day margin and
// bucket precisely via dayKey() (Warsaw-pinned), so orders completed around
// midnight at a month edge land in the right statement. Gastro courses carry
// a plain date (delivered_on), so they filter directly.
//
// All money math is done in grosze (integers); rounding rules live in
// lib/payments/pricing.ts.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN, formatDate, dayKey } from '@/lib/utils/formatters';
import { toGr, jokusorShareGr, effectiveShare } from '@/lib/payments/pricing';
import { getCurrentFeeConfig } from '@/lib/payments/feeConfig';

type PageProps = { searchParams: Promise<{ m?: string }> };

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type BillingConfig = {
  payout_share: number | null;
  subscription_amount: number | null;
};

type CompletedOrder = {
  id: string;
  base_price: number;
  total_price: number;
  jokusor_share_frozen: number | null;
  completed_at: string;
  modules: { name: string } | null;
};

type GastroCourse = {
  id: string;
  delivered_on: string;
  distance_km: number;
  fee: number;
  jokusor_share_frozen: number;
  restaurants: { name: string } | null;
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
  const nextYmFirst = `${shiftMonth(ym, 1)}-01`;

  const [
    { data: jokRow },
    { data: orderRows, error: oErr },
    { data: tipRows, error: tErr },
    { data: gastroRows, error: gErr },
    feeConfig
  ] = await Promise.all([
    supabase
      .from('jokusors')
      .select('payout_share, subscription_amount')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, base_price, total_price, jokusor_share_frozen, completed_at, modules(name)')
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
      .lt('created_at', windowEnd),
    supabase
      .from('gastro_orders')
      .select('id, delivered_on, distance_km, fee, jokusor_share_frozen, restaurants(name)')
      .eq('jokusor_id', user.id)
      .gte('delivered_on', `${ym}-01`)
      .lt('delivered_on', nextYmFirst)
      .order('delivered_on', { ascending: false }),
    getCurrentFeeConfig(supabase, 'consumer')
  ]);

  if (oErr || tErr || gErr) {
    console.error('[/earnings] fetch', oErr ?? tErr ?? gErr);
    throw new Error('Nie udało się załadować zestawienia zarobków');
  }

  const billing = jokRow as BillingConfig | null;
  const subscriptionGr =
    billing?.subscription_amount != null ? toGr(billing.subscription_amount) : 0;

  // The rate that will apply to the jokusor's NEXT order (informational —
  // never used for the sums below, which read only frozen values).
  const currentShare =
    feeConfig !== null ? effectiveShare(billing?.payout_share, feeConfig.jokusor_share) : null;
  const isException = billing?.payout_share != null;

  // Bucket to the requested Warsaw-local month.
  const orders = ((orderRows as unknown as CompletedOrder[] | null) ?? []).filter((o) =>
    dayKey(o.completed_at).startsWith(ym)
  );
  const tips = ((tipRows as TipRow[] | null) ?? []).filter((t) =>
    dayKey(t.created_at).startsWith(ym)
  );
  const gastro = (gastroRows as unknown as GastroCourse[] | null) ?? [];

  const tipsByOrder = new Map<string, number>();
  for (const t of tips) {
    tipsByOrder.set(t.order_id, (tipsByOrder.get(t.order_id) ?? 0) + toGr(t.amount));
  }

  // Frozen service price per order = orders.base_price; frozen share on top.
  // The ?? chain is defensive only (an order paid before the *_frozen backfill
  // could in theory carry NULL) — it still resolves from the DB, never from a
  // constant.
  const shareFrac = (o: CompletedOrder) =>
    o.jokusor_share_frozen ?? currentShare ?? billing?.payout_share ?? 0;
  const feeGr = (o: CompletedOrder) => toGr(o.base_price);
  const shareGr = (o: CompletedOrder) => jokusorShareGr(feeGr(o), shareFrac(o));
  // For grocery orders total = fee + basket, so the basket is derivable from
  // the two persisted columns (display only — not part of earnings).
  const basketGr = (o: CompletedOrder) => Math.max(0, toGr(o.total_price) - feeGr(o));
  const sharePct = (frac: number) => `${(frac * 100).toLocaleString('pl-PL')}%`;

  const feesGr = orders.reduce((sum, o) => sum + feeGr(o), 0);
  const sharesGr = orders.reduce((sum, o) => sum + shareGr(o), 0);
  const gastroShareGr = (g: GastroCourse) => jokusorShareGr(toGr(g.fee), g.jokusor_share_frozen);
  const gastroFeesGr = gastro.reduce((sum, g) => sum + toGr(g.fee), 0);
  const gastroSharesGr = gastro.reduce((sum, g) => sum + gastroShareGr(g), 0);
  const tipsGr = tips.reduce((sum, t) => sum + toGr(t.amount), 0);
  const payoutGr = sharesGr + gastroSharesGr + tipsGr - subscriptionGr;

  const monthLabel = MONTH_LABEL_FMT.format(new Date(`${ym}-15T12:00:00Z`));
  const prevYm = shiftMonth(ym, -1);
  const nextYm = shiftMonth(ym, 1);
  const showNext = nextYm <= currentYm;

  const fmt = (gr: number) => formatPLN(gr / 100);

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
              Twój udział (wg stawki zamrożonej przy zamówieniu)
            </dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">+{fmt(sharesGr)}</dd>
          </div>
          {gastro.length > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Kursy gastro — {gastro.length} (płatnik: restauracja, {fmt(gastroFeesGr)} netto)
              </dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                +{fmt(gastroSharesGr)}
              </dd>
            </div>
          )}
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
          {currentShare != null && (
            <>
              Twoja stawka dla nowych zleceń: {sharePct(currentShare)}
              {isException ? ' (wyjątek indywidualny)' : ' (reguła ogólna)'}.{' '}
            </>
          )}
          Cena usługi i Twój udział są zamrożone z chwili opłacenia zamówienia — późniejsze zmiany
          cennika ani stawek nie zmieniają zamkniętych miesięcy. Zwrot kosztów produktów (koszyk)
          nie jest częścią zarobku. Zestawienie ma charakter informacyjny — nie jest fakturą ani
          wezwaniem do zapłaty.
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
                      cena usługi {fmt(feeGr(o))} · udział {sharePct(shareFrac(o))} → +
                      {fmt(shareGr(o))}
                      {tipGr > 0 ? ` · napiwek +${fmt(tipGr)}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {gastro.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Kursy gastro w tym okresie
          </h2>
          <ul className="mt-3 space-y-2">
            {gastro.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {g.restaurants?.name ?? 'Restauracja'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {formatDate(`${g.delivered_on}T12:00:00Z`)} ·{' '}
                    {g.distance_km.toLocaleString('pl-PL')} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    +{fmt(gastroShareGr(g))}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    opłata {fmt(toGr(g.fee))} netto · udział {sharePct(g.jokusor_share_frozen)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
