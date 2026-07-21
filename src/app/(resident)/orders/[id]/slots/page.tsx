// /orders/[id]/slots — slot picker for an in-progress draft order.
//
// Server component. Branches on order.status:
//   - 'draft'  → show <SlotGrid>            (resident picks a slot)
//   - 'hold'   → show <HoldView>            (90s countdown + placeholder pay)
//   - other    → show "already past picker" message (e.g. paid, completed)
//
// RLS ensures `orders_read_resident` — a stranger pasting another user's id
// gets `notFound()`.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import type { Order } from '@/lib/types/orders';
import type { Module } from '@/lib/types/modules';
import SlotGrid from './SlotGrid';
import HoldView from './HoldView';

type PageProps = {
  params: Promise<{ id: string }>;
};

type Slot = {
  jokusor_id: string;
  jokusor_name: string | null;
  slot_start: string;
  slot_end: string;
};

type TimeSlotRow = {
  id: string;
  range: string;
  hold_expires_at: string | null;
  status: string;
};

type JokusorUser = {
  full_name: string | null;
};

// Parse Postgres tstzrange literal "[2026-05-25 06:00:00+00,2026-05-25 06:20:00+00)"
// into [startIso, endIso]. Returns null on unparseable input.
function parseTstzRange(range: string): [string, string] | null {
  const match = range.match(/^[[(]"?([^,"]+)"?,"?([^,"]+)"?[\])]$/);
  if (!match) return null;
  const startDate = new Date(match[1]);
  const endDate = new Date(match[2]);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return [startDate.toISOString(), endDate.toISOString()];
}

export default async function OrderSlotsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // -------- Fetch order (RLS filters to resident_id = auth.uid()) ----------
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (orderErr) {
    console.error('[/orders/[id]/slots] order fetch', orderErr);
    throw new Error('Nie udało się załadować zamówienia');
  }
  if (!orderRow) notFound();

  const order = orderRow as Order;

  // -------- Fetch module (for slug + duration) -----------------------------
  const { data: moduleRow } = await supabase
    .from('modules')
    .select('slug, name, estimated_duration_min')
    .eq('id', order.module_id)
    .maybeSingle();

  if (!moduleRow) {
    console.error('[/orders/[id]/slots] module not found', order.module_id);
    throw new Error('Nie udało się załadować modułu zamówienia');
  }

  const moduleData = moduleRow as Pick<Module, 'slug' | 'name' | 'estimated_duration_min'>;

  // -------- Branch on status ------------------------------------------------
  let inner: React.ReactNode;

  if (order.status === 'draft') {
    // Fetch available slots via the SECURITY DEFINER RPC.
    const { data: slotData, error: slotErr } = await supabase.rpc(
      'get_available_slots' as never,
      {
        p_address_id: order.address_id,
        p_module_slug: moduleData.slug
      } as never
    );

    if (slotErr) {
      console.error('[/orders/[id]/slots] slot fetch', slotErr);
      throw new Error('Nie udało się załadować wolnych terminów');
    }

    const slots = (slotData as Slot[] | null) ?? [];
    inner = <SlotGrid orderId={order.id} slots={slots} />;
  } else if (order.status === 'hold') {
    // Find the active hold time_slot for this order
    const { data: tsRow } = await supabase
      .from('time_slots')
      .select('id, range, hold_expires_at, status')
      .eq('order_id', order.id)
      .eq('status', 'hold')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tsRow) {
      // Order says 'hold' but no matching time_slot — stale state, treat as
      // unrecoverable for now (user can refresh or open a new order).
      console.error('[/orders/[id]/slots] order hold without time_slot', order.id);
      throw new Error('Stan zamówienia rozjechał się z bazą — odśwież stronę.');
    }

    const ts = tsRow as TimeSlotRow;
    const parsed = parseTstzRange(ts.range);
    const slotStart = parsed ? parsed[0] : (order.scheduled_at ?? new Date().toISOString());
    const slotEnd = parsed
      ? parsed[1]
      : new Date(
          new Date(slotStart).getTime() + (moduleData.estimated_duration_min ?? 20) * 60_000
        ).toISOString();

    // Fetch jokusor name (full_name is in public.users)
    let jokusorName: string | null = null;
    if (order.jokusor_id) {
      const { data: jokUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', order.jokusor_id)
        .maybeSingle();
      jokusorName = (jokUser as JokusorUser | null)?.full_name ?? null;
    }

    inner = (
      <HoldView
        orderId={order.id}
        timeSlotId={ts.id}
        holdExpiresAt={ts.hold_expires_at ?? new Date().toISOString()}
        scheduledAt={slotStart}
        slotEndAt={slotEnd}
        jokusorName={jokusorName}
        totalPrice={order.total_price}
      />
    );
  } else {
    // 'pending', 'accepted', 'completed', etc — past the picker.
    inner = (
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Zamówienie poza etapem wyboru terminu
        </h2>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Status: <code>{order.status}</code>. Wybór slotu jest już za Tobą.
        </p>
      </section>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Wszystkie usługi
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {moduleData.name}
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          {formatPLN(order.total_price)} · {moduleData.estimated_duration_min} min
        </p>
      </header>

      {inner}
    </main>
  );
}
