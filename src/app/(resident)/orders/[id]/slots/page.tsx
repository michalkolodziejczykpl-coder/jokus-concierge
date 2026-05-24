// /orders/[id]/slots — placeholder for the slot picker.
//
// Lands here straight after `POST /api/orders/draft`. For now we just confirm
// the draft was saved and show a "coming soon" message. Next sprint replaces
// the body with the real picker (90-second slot hold + Przelewy24 BLIK).
//
// RLS ensures `orders_read_resident` — a user can only fetch their own
// orders, so a stranger pasting another user's ID into the URL gets 404.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import type { Order } from '@/lib/types/orders';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderSlotsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[/orders/[id]/slots] fetch error', error);
    throw new Error('Nie udało się załadować zamówienia');
  }
  if (!orderRow) {
    notFound();
  }

  const order = orderRow as unknown as Order;

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
          Zamówienie zapisane
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          Twój wstępny formularz jest w bazie ze statusem <code>{order.status}</code>. Brakuje już
          tylko wyboru terminu i płatności.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Podsumowanie
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">ID zamówienia</dt>
            <dd className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{order.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">Cena bazowa</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatPLN(order.base_price)}
            </dd>
          </div>
          {order.estimated_duration_min !== null && (
            <div className="flex justify-between">
              <dt className="text-neutral-600 dark:text-neutral-400">Szacowany czas</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {order.estimated_duration_min} min
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Wybór terminu — wkrótce</p>
          <p className="mt-1 text-orange-800 dark:text-orange-300/90">
            Lista wolnych slotów u jokusorów z Twojego osiedla pojawi się tutaj w następnym
            sprincie. Wtedy też pójdzie 90-sekundowy hold + płatność BLIK.
          </p>
        </div>
      </section>

      <Link
        href="/home"
        className="mt-8 inline-block rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        Wróć na stronę główną
      </Link>
    </main>
  );
}
