// /gastro — admin: gastro course log + weekly per-restaurant statement
// (Mon–Sun) with CSV export, the basis for the collective invoice (MVP has no
// invoicing integration). Admin-gated like the other (admin) pages.
//
// All amounts shown are the NET fees frozen on each course row — never
// recomputed from the current fee_config.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentFeeConfig } from '@/lib/payments/feeConfig';
import { toGr, jokusorShareGr } from '@/lib/payments/pricing';
import { formatPLN, dayKey } from '@/lib/utils/formatters';
import { mondayOf, addDays, DATE_ONLY_RE } from '@/lib/utils/week';
import GastroCourseForm from '@/components/admin/GastroCourseForm';
import GastroCourseDeleteButton from '@/components/admin/GastroCourseDeleteButton';

type PageProps = { searchParams: Promise<{ w?: string }> };

type CourseRow = {
  id: string;
  delivered_on: string;
  distance_km: number;
  fee: number;
  jokusor_share_frozen: number;
  notes: string | null;
  jokusor_id: string;
  restaurants: { name: string } | null;
};

export default async function GastroPage({ searchParams }: PageProps) {
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

  const { w } = await searchParams;
  const today = dayKey(new Date().toISOString());
  const monday = mondayOf(w && DATE_ONLY_RE.test(w) ? w : today);
  const sunday = addDays(monday, 6);
  const nextMonday = addDays(monday, 7);

  const [{ data: courseRows, error: cErr }, { data: restRows }, { data: jokUsers }, feeConfig] =
    await Promise.all([
      supabase
        .from('gastro_orders')
        .select(
          'id, delivered_on, distance_km, fee, jokusor_share_frozen, notes, jokusor_id, restaurants(name)'
        )
        .gte('delivered_on', monday)
        .lt('delivered_on', nextMonday)
        .order('delivered_on', { ascending: false }),
      supabase.from('restaurants').select('id, name, is_active').order('name'),
      supabase.from('users').select('id, full_name').eq('role', 'jokusor'),
      getCurrentFeeConfig(supabase, 'gastro')
    ]);

  if (cErr) {
    console.error('[/gastro] fetch', cErr);
    throw new Error('Nie udało się załadować kursów gastro');
  }

  const courses = (courseRows as unknown as CourseRow[] | null) ?? [];
  const restaurants = (restRows as { id: string; name: string; is_active: boolean }[] | null) ?? [];
  const jokusorName = new Map(
    ((jokUsers as { id: string; full_name: string | null }[] | null) ?? []).map((u) => [
      u.id,
      u.full_name ?? '—'
    ])
  );

  // Per-restaurant weekly totals (net fees + the jokusors' frozen cut).
  const totals = new Map<string, { count: number; feeGr: number; shareGr: number }>();
  for (const c of courses) {
    const key = c.restaurants?.name ?? '—';
    const t = totals.get(key) ?? { count: 0, feeGr: 0, shareGr: 0 };
    t.count += 1;
    t.feeGr += toGr(c.fee);
    t.shareGr += jokusorShareGr(toGr(c.fee), c.jokusor_share_frozen);
    totals.set(key, t);
  }
  const weekFeeGr = [...totals.values()].reduce((s, t) => s + t.feeGr, 0);

  const pricing =
    feeConfig &&
    feeConfig.gastro_base_fee != null &&
    feeConfig.gastro_included_km != null &&
    feeConfig.gastro_per_km_fee != null
      ? {
          baseFee: feeConfig.gastro_base_fee,
          includedKm: feeConfig.gastro_included_km,
          perKmFee: feeConfig.gastro_per_km_fee
        }
      : null;

  const fmtDay = (d: string) => d.slice(8, 10) + '.' + d.slice(5, 7);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Panel administratora
      </Link>

      <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Gastro — dostawy dla restauracji
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Płatnikiem jest restauracja — tygodniowe zestawienie pod fakturę zbiorczą.
          </p>
        </div>
        <Link
          href="/gastro/restaurants"
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          <Store className="h-4 w-4" aria-hidden="true" />
          Restauracje
        </Link>
      </header>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Dodaj kurs</h2>
        <div className="mt-4">
          <GastroCourseForm
            restaurants={restaurants
              .filter((r) => r.is_active)
              .map((r) => ({ id: r.id, label: r.name }))}
            jokusors={[...jokusorName.entries()].map(([id, label]) => ({ id, label }))}
            today={today}
            pricing={pricing}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Tydzień {fmtDay(monday)} – {fmtDay(sunday)}
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/gastro?w=${addDays(monday, -7)}`}
              aria-label="Poprzedni tydzień"
              className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/gastro?w=${addDays(monday, 7)}`}
              aria-label="Następny tydzień"
              className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={`/api/admin/gastro/export?w=${monday}`}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </a>
          </div>
        </div>

        {totals.size === 0 ? (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak kursów w tym tygodniu.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full bg-white text-sm dark:bg-neutral-950">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                  <th className="px-4 py-2.5">Restauracja</th>
                  <th className="px-4 py-2.5 text-right">Kursy</th>
                  <th className="px-4 py-2.5 text-right">Do faktury (netto)</th>
                  <th className="px-4 py-2.5 text-right">W tym udział jokusorów</th>
                </tr>
              </thead>
              <tbody>
                {[...totals.entries()].map(([name, t]) => (
                  <tr key={name} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {name}
                    </td>
                    <td className="px-4 py-2.5 text-right">{t.count}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatPLN(t.feeGr / 100)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-neutral-600 dark:text-neutral-400">
                      {formatPLN(t.shareGr / 100)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-neutral-900 dark:text-neutral-50">
                    Razem
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{courses.length}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{formatPLN(weekFeeGr / 100)}</td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Kursy w tym tygodniu
        </h2>
        {courses.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Nic tu jeszcze nie ma.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {courses.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {c.restaurants?.name ?? '—'} · {fmtDay(c.delivered_on)} ·{' '}
                    {c.distance_km.toLocaleString('pl-PL')} km
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {jokusorName.get(c.jokusor_id) ?? c.jokusor_id} · udział{' '}
                    {(c.jokusor_share_frozen * 100).toLocaleString('pl-PL')}%
                    {c.notes ? ` · ${c.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatPLN(c.fee)}
                  </span>
                  <GastroCourseDeleteButton courseId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
