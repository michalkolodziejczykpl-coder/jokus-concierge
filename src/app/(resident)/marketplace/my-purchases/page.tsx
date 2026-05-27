// /marketplace/my-purchases — items the user has bought (i.e. they're the buyer
// on a marketplace_purchases row). Joins to the original listing for title /
// photos / price + the delivery order for status link.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ImageOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import type { OrderStatus } from '@/lib/types/orderStatus';
import {
  CATEGORY_LABELS,
  type ListingCategory
} from '@/lib/types/marketplace';

type PurchaseRow = {
  id: string;
  item_price: number;
  delivery_price: number | null;
  payment_status: string;
  created_at: string;
  marketplace_listings: {
    id: string;
    title: string;
    category: ListingCategory;
    photos: string[];
  } | null;
  orders: {
    id: string;
    status: OrderStatus;
  } | null;
};

// Friendlier label for the underlying delivery order status. Marketplace
// "lifecycle" mirrors the regular order lifecycle.
const ORDER_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  draft: 'Wersja robocza',
  hold: 'Rezerwacja slotu',
  pending: 'Opłacone',
  accepted: 'Zaakceptowane',
  in_transit: 'Jokusor w drodze',
  at_pickup: 'W punkcie odbioru',
  in_progress: 'W trakcie',
  in_return: 'Droga powrotna',
  completed: 'Dostarczone',
  cancelled: 'Anulowane',
  disputed: 'Reklamacja'
};

export default async function MyPurchasesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('marketplace_purchases')
    .select(
      'id, item_price, delivery_price, payment_status, created_at, ' +
        'marketplace_listings(id, title, category, photos), ' +
        'orders:delivery_order_id(id, status)'
    )
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[/marketplace/my-purchases] fetch', error);
    throw new Error('Nie udało się załadować zakupów');
  }

  const purchases = (rows as unknown as PurchaseRow[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Marketplace
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Moje zakupy
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Rzeczy kupione od sąsiadów z dostawą przez jokusora.
        </p>
      </header>

      <section className="mt-8">
        {purchases.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Jeszcze nic nie kupiłeś/aś. Wróć do{' '}
            <Link href="/marketplace" className="text-orange-600 hover:underline dark:text-orange-400">
              marketplace osiedla
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-4">
            {purchases.map((p) => {
              const listing = p.marketplace_listings;
              const order = p.orders;
              const orderStatusLabel = order
                ? ORDER_STATUS_LABEL[order.status] ?? order.status
                : 'Brak zamówienia';
              const total = p.item_price + (p.delivery_price ?? 0);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
                    {listing?.photos && listing.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photos[0]}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400 dark:text-neutral-600">
                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                      {listing?.title ?? '(usunięte ogłoszenie)'}
                    </h2>
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                      {listing ? CATEGORY_LABELS[listing.category] : ''} ·{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatPLN(total)}
                      </span>
                      <span className="text-xs text-neutral-500"> ({formatPLN(p.item_price)} + dostawa)</span>
                    </p>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                      Status dostawy:{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {orderStatusLabel}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {listing && (
                      <Link
                        href={`/marketplace/${listing.id}`}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                      >
                        Ogłoszenie
                      </Link>
                    )}
                    {order && (
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                      >
                        Śledź dostawę
                      </Link>
                    )}
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
