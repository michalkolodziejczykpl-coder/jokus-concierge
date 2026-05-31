// /orders/[id] — resident order detail / status tracker.
//
// Lands here after mock-pay. Shows current status, jokusor name, scheduled time.
// Auto-refreshes every 10 seconds so the resident sees state changes (accepted,
// in_progress, completed) without manual reload. Cheap polling for sprint 4;
// real-time Supabase channel subscription comes in a later sprint.
//
// RLS ensures only the resident or assigned jokusor can read this row.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN, formatDayHeader, formatSlotRange } from '@/lib/utils/formatters';
import type { OrderStatus } from '@/lib/types/orderStatus';
import OrderAutoRefresh from './OrderAutoRefresh';
import LiveTrackingView from './LiveTrackingView';
import OrderChat from '@/components/shared/OrderChat';
import RatingTip from '@/components/resident/RatingTip';
import ReorderButton from '@/components/resident/ReorderButton';

type PageProps = { params: Promise<{ id: string }> };

type PickupAddr = {
  street: string;
  building: string;
  apartment: string | null;
  city: string;
  postal_code: string;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  total_price: number;
  scheduled_at: string | null;
  estimated_duration_min: number | null;
  notes: string | null;
  resident_id: string;
  jokusor_id: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  pickup_address: PickupAddr | null;
  modules: { name: string; estimated_duration_min: number } | null;
};

const STATUS_VIEW: Record<OrderStatus, { label: string; tone: string; description: string }> = {
  draft: {
    label: 'Wersja robocza',
    tone: 'border-neutral-300 bg-neutral-100 text-neutral-700',
    description: 'Zamówienie zapisane, jeszcze nie wybrałeś terminu.'
  },
  hold: {
    label: 'Rezerwacja slotu',
    tone: 'border-orange-300 bg-orange-50 text-orange-900',
    description: 'Slot zarezerwowany, czekamy na płatność.'
  },
  pending: {
    label: 'Opłacone — czeka na akceptację',
    tone: 'border-amber-300 bg-amber-50 text-amber-900',
    description: 'Płatność zaksięgowana. Jokusor zaraz zaakceptuje zlecenie.'
  },
  accepted: {
    label: 'Zaakceptowane',
    tone: 'border-blue-300 bg-blue-50 text-blue-900',
    description: 'Jokusor wie o zleceniu i jest gotowy. Czeka na termin.'
  },
  in_transit: {
    label: 'Jokusor w drodze',
    tone: 'border-green-300 bg-green-50 text-green-900',
    description: 'Jokusor jedzie do punktu odbioru.'
  },
  at_pickup: {
    label: 'W punkcie odbioru',
    tone: 'border-green-300 bg-green-50 text-green-900',
    description: 'Jokusor jest w punkcie odbioru.'
  },
  in_progress: {
    label: 'W trakcie realizacji',
    tone: 'border-green-300 bg-green-50 text-green-900',
    description: 'Jokusor pracuje nad Twoim zleceniem.'
  },
  in_return: {
    label: 'Droga powrotna',
    tone: 'border-green-300 bg-green-50 text-green-900',
    description: 'Jokusor wraca z odbiorem.'
  },
  completed: {
    label: 'Zakończone',
    tone: 'border-green-500 bg-green-50 text-green-900',
    description: 'Zlecenie wykonane. Dziękujemy!'
  },
  cancelled: {
    label: 'Anulowane',
    tone: 'border-neutral-300 bg-neutral-100 text-neutral-700',
    description: 'Zamówienie zostało anulowane.'
  },
  disputed: {
    label: 'W reklamacji',
    tone: 'border-red-300 bg-red-50 text-red-900',
    description: 'Trwa rozpatrywanie reklamacji.'
  }
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row, error } = await supabase
    .from('orders')
    .select(
      'id, status, total_price, scheduled_at, estimated_duration_min, notes, ' +
        'resident_id, jokusor_id, accepted_at, started_at, completed_at, pickup_address, ' +
        'modules(name, estimated_duration_min)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[/orders/[id]] fetch', error);
    throw new Error('Nie udało się załadować zamówienia');
  }
  if (!row) notFound();

  const order = row as unknown as OrderDetail;
  const status = STATUS_VIEW[order.status];

  // If still draft, send back to slot picker
  if (order.status === 'draft' || order.status === 'hold') {
    redirect(`/orders/${order.id}/slots`);
  }

  // Fetch jokusor name (works via users_read_public_profile policy)
  let jokusorName: string | null = null;
  if (order.jokusor_id) {
    const { data: jokRow } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', order.jokusor_id)
      .maybeSingle();
    jokusorName = (jokRow as { full_name?: string | null } | null)?.full_name ?? null;
  }

  let jokusorPhoto: string | null = null;
  if (order.jokusor_id) {
    const { data: jp } = await supabase
      .from('jokusors')
      .select('public_photo_url')
      .eq('user_id', order.jokusor_id)
      .maybeSingle();
    jokusorPhoto = (jp as { public_photo_url?: string | null } | null)?.public_photo_url ?? null;
  }

  // Rating + tip state (resident, completed orders only).
  const isResidentViewer = user.id === order.resident_id;
  let myRatingStars: number | null = null;
  let myRatingComment: string | null = null;
  let tipTotal = 0;
  if (order.status === 'completed' && isResidentViewer && order.jokusor_id) {
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from('ratings').select('stars, comment').eq('order_id', order.id).maybeSingle(),
      supabase.from('tips').select('amount').eq('order_id', order.id)
    ]);
    const rr = r as { stars: number; comment: string | null } | null;
    myRatingStars = rr?.stars ?? null;
    myRatingComment = rr?.comment ?? null;
    tipTotal = ((t as { amount: number }[] | null) ?? []).reduce(
      (sum, x) => sum + Number(x.amount),
      0
    );
  }

  const { data: orderItemRows } = await supabase
    .from('order_items')
    .select('name_snapshot, unit, quantity, estimated_unit_price, note')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });
  const orderItems =
    (orderItemRows as
      | {
          name_snapshot: string;
          unit: string;
          quantity: number;
          estimated_unit_price: number;
          note: string | null;
        }[]
      | null) ?? [];

  const isTerminal = order.status === 'completed' || order.status === 'cancelled';
  const isInFlight =
    order.status === 'in_progress' ||
    order.status === 'in_transit' ||
    order.status === 'at_pickup' ||
    order.status === 'in_return';
  const slotEndIso = order.scheduled_at
    ? new Date(
        new Date(order.scheduled_at).getTime() +
          (order.estimated_duration_min ?? order.modules?.estimated_duration_min ?? 20) * 60_000
      ).toISOString()
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <header className="mb-6 mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {order.modules?.name ?? 'Zamówienie'}
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          {formatPLN(order.total_price)}
          {order.estimated_duration_min ? ` · ${order.estimated_duration_min} min` : ''}
        </p>
      </header>

      <section
        className={`rounded-2xl border-2 p-6 ${status.tone} dark:border-opacity-50 dark:bg-opacity-20`}
      >
        <div className="flex items-start gap-3">
          {order.status === 'completed' ? (
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
          )}
          <div>
            <h2 className="text-xl font-bold">{status.label}</h2>
            <p className="mt-1 text-sm">{status.description}</p>
          </div>
        </div>
      </section>

      {isInFlight && <LiveTrackingView orderId={order.id} />}

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Szczegóły
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          {order.scheduled_at && slotEndIso && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-600 dark:text-neutral-400">Termin</dt>
              <dd className="text-right font-medium text-neutral-900 dark:text-neutral-100">
                {formatDayHeader(order.scheduled_at)}
                <br />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {formatSlotRange(order.scheduled_at, slotEndIso)}
                </span>
              </dd>
            </div>
          )}
          {jokusorName && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-600 dark:text-neutral-400">Jokusor</dt>
              <dd className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                {jokusorPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={jokusorPhoto}
                    alt={jokusorName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                {jokusorName}
              </dd>
            </div>
          )}
          {order.pickup_address && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-600 dark:text-neutral-400">Odbiór od</dt>
              <dd className="text-right text-neutral-900 dark:text-neutral-100">
                ul. {order.pickup_address.street} {order.pickup_address.building}
                {order.pickup_address.apartment ? `/${order.pickup_address.apartment}` : ''}
                <br />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {order.pickup_address.postal_code} {order.pickup_address.city}
                </span>
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-600 dark:text-neutral-400">ID zamówienia</dt>
            <dd className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{order.id}</dd>
          </div>
        </dl>
      </section>

      {orderItems.length > 0 && (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Lista zakupów
          </h2>
          <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            {orderItems.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 text-neutral-800 dark:text-neutral-200">
                  {it.name_snapshot}{' '}
                  <span className="text-neutral-500">
                    × {it.quantity} {it.unit}
                  </span>
                  {it.note && <span className="block text-xs text-neutral-500">{it.note}</span>}
                </span>
                <span className="shrink-0 text-neutral-600 dark:text-neutral-400">
                  {formatPLN(it.estimated_unit_price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-500">
            Ceny orientacyjne; ostateczna kwota wg paragonu po zakupach.
          </p>
          {isResidentViewer && (
            <div className="mt-4">
              <ReorderButton orderId={order.id} />
            </div>
          )}
        </section>
      )}

      {isResidentViewer && order.status === 'completed' && order.jokusor_id && (
        <section className="mt-6">
          <RatingTip
            orderId={order.id}
            existingStars={myRatingStars}
            existingComment={myRatingComment}
            tippedTotal={tipTotal}
          />
        </section>
      )}

      {order.jokusor_id && order.status !== 'cancelled' && (
        <section className="mt-6">
          <OrderChat
            orderId={order.id}
            meId={user.id}
            otherLabel={user.id === order.resident_id ? 'Jokusor' : 'Klient'}
          />
        </section>
      )}

      {/* Auto-refresh keeps the status fresh while the order is in flight */}
      {!isTerminal && <OrderAutoRefresh />}
    </main>
  );
}
