// /marketplace/[id] — listing detail.
// Anyone on the same estate (or the seller themselves) can view.
// Buy button is hidden for the seller's own listing.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, MapPin, Package2, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  DELIVERY_OPTION_LABELS,
  type ListingRow
} from '@/lib/types/marketplace';
import BuyButton from './BuyButton';
import Gallery from './Gallery';

type PageProps = { params: Promise<{ id: string }> };

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row, error } = await supabase
    .from('marketplace_listings')
    .select(
      'id, seller_id, estate_id, title, description, category, price, currency, condition, status, photos, pickup_address, delivery_option, created_at, views_count'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[/marketplace/[id]] fetch', error);
    throw new Error('Nie udało się załadować ogłoszenia');
  }
  if (!row) notFound();

  const listing = row as unknown as ListingRow;
  const isOwn = listing.seller_id === user.id;
  const allowsDelivery =
    listing.delivery_option === 'migmig_only' || listing.delivery_option === 'migmig_or_pickup';

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Marketplace
      </Link>

      {listing.photos.length > 0 && (
        <div className="mt-6">
          <Gallery photos={listing.photos} title={listing.title} />
        </div>
      )}

      <header className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {listing.title}
          </h1>
          {listing.status !== 'active' && (
            <span className="shrink-0 rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold uppercase text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {listing.status === 'reserved' && 'Zarezerwowane'}
              {listing.status === 'sold' && 'Sprzedane'}
              {listing.status === 'archived' && 'Zarchiwizowane'}
              {listing.status === 'removed' && 'Usunięte'}
            </span>
          )}
        </div>
        <p className="mt-2 text-4xl font-bold text-orange-600 dark:text-orange-400">
          {formatPLN(listing.price)}
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Tag className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          {CATEGORY_LABELS[listing.category]}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Package2 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          Stan: {CONDITION_LABELS[listing.condition]}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          {listing.pickup_address.street} {listing.pickup_address.building}
        </div>
      </section>

      {listing.description && (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Opis
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-neutral-800 dark:text-neutral-200">
            {listing.description}
          </p>
        </section>
      )}

      <section className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
        {DELIVERY_OPTION_LABELS[listing.delivery_option]}
      </section>

      <section className="mt-8">
        {isOwn ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            To Twoje ogłoszenie. Kupujący zobaczą tu przycisk &ldquo;Kup z dostawą&rdquo;.
          </div>
        ) : listing.status !== 'active' ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Ogłoszenie nie jest już dostępne.
          </div>
        ) : allowsDelivery ? (
          <BuyButton listingId={listing.id} itemPrice={listing.price} />
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Sprzedawca zaznaczył tylko odbiór osobisty — dostawa MIGMIG niedostępna.
          </div>
        )}
      </section>
    </main>
  );
}
