// /dashboard — jokusor home: list of active assignments.
//
// Sprint 4 minimum: shows orders in (pending, accepted, in_progress) assigned
// to the logged-in jokusor, with action buttons (accept/start/complete).
// Future sprints add: calendar view, earnings, completed orders history.
//
// Role gate: if a non-jokusor lands here, bounce them to /home.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN, formatDayHeader, formatSlotRange } from '@/lib/utils/formatters';
import OrderActions from './OrderActions';

type DashboardOrder = {
  id: string;
  status: 'pending' | 'accepted' | 'in_progress';
  total_price: number;
  scheduled_at: string | null;
  estimated_duration_min: number | null;
  notes: string | null;
  modules: { name: string; estimated_duration_min: number } | null;
  users: { full_name: string | null } | null;
  addresses: {
    street: string;
    building: string;
    apartment: string | null;
    city: string;
    postal_code: string;
  } | null;
};

const STATUS_LABELS: Record<DashboardOrder['status'], { label: string; tone: string }> = {
  pending: {
    label: 'Czeka na akceptację',
    tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200'
  },
  accepted: {
    label: 'Zaakceptowane',
    tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200'
  },
  in_progress: {
    label: 'W trakcie',
    tone: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-200'
  }
};

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function JokusorDashboard() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Role gate
  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role !== 'jokusor') {
    redirect('/home');
  }

  const fullName = (profile as { full_name?: string | null } | null)?.full_name ?? user.email;

  // Active assignments
  const { data: rows, error } = await supabase
    .from('orders')
    .select(
      'id, status, total_price, scheduled_at, estimated_duration_min, notes, ' +
        'modules(name, estimated_duration_min), ' +
        'users:resident_id(full_name), ' +
        'addresses(street, building, apartment, city, postal_code)'
    )
    .eq('jokusor_id', user.id)
    .in('status', ['pending', 'accepted', 'in_progress'])
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[/dashboard] orders fetch', error);
    throw new Error('Nie udało się załadować zleceń');
  }

  const orders = (rows as unknown as DashboardOrder[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Twoje zlecenia
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Zalogowany/a jako {fullName}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Wyloguj
          </button>
        </form>
      </header>

      <section className="mt-8">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak aktywnych zleceń. Zostań przy aplikacji — gdy mieszkaniec opłaci zamówienie,
            pojawi się tutaj.
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => {
              const statusInfo = STATUS_LABELS[o.status];
              const moduleName = o.modules?.name ?? 'Zlecenie';
              const residentName = o.users?.full_name ?? '(nieznany)';
              const addr = o.addresses;
              return (
                <li
                  key={o.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                        {moduleName}
                      </h2>
                      <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                        {residentName} · {formatPLN(o.total_price)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.tone}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {o.scheduled_at && (
                    <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="text-neutral-500 dark:text-neutral-500">Termin: </span>
                      {formatDayHeader(o.scheduled_at)} ·{' '}
                      {formatSlotRange(
                        o.scheduled_at,
                        new Date(
                          new Date(o.scheduled_at).getTime() +
                            (o.estimated_duration_min ?? o.modules?.estimated_duration_min ?? 20) *
                              60_000
                        ).toISOString()
                      )}
                    </p>
                  )}

                  {addr && (
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                      <span className="text-neutral-500 dark:text-neutral-500">Adres: </span>
                      ul. {addr.street} {addr.building}
                      {addr.apartment ? `/${addr.apartment}` : ''}, {addr.postal_code} {addr.city}
                    </p>
                  )}

                  {o.notes && (
                    <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                      <span className="font-medium">Uwagi: </span>
                      {o.notes}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <OrderActions orderId={o.id} status={o.status} />
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      Szczegóły
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
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
