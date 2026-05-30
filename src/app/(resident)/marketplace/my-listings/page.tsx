// /marketplace/my-listings — own listings, any status (active/reserved/sold/archived).
//
// Differs from /marketplace browse: no estate filter, no exclude-own, shows
// status badge per listing + edit/delete actions.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ImageOff, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type ListingCategory,
  type ListingCondition,
  type ListingStatus
} from '@/lib/types/marketplace';
import ListingCardActions from '@/components/marketplace/ListingCardActions';

type Row = {
  id: string;
  title: string;
  category: ListingCategory;
  price: number;
  condition: ListingCondition;
  status: ListingStatus;
  photos: string[];
  created_at: string;
};

const STATUS_BADGE: Record<ListingStatus, { label: string; tone: string }> = {
  active: {
    label: 'Aktywne',
    tone: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-200'
  },
  reserved: {
    label: 'Zarezerwowane',
    tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200'
  },
  sold: {
    label: 'Sprzedane',
    tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200'
  },
  archived: {
    label: 'Zarchiwizowane',
    tone: 'border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
  },
  removed: {
    label: 'Usunięte',
    tone: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-200'
  }
};

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('marketplace_listings')
    .select('id, title, category, price, condition, status, photos, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[/marketplace/my-listings] fetch', error);
    throw new Error('Nie udało się załadować ogłoszeń');
  }

  const listings = (rows as unknown as Row[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Marketplace
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Moje ogłoszenia
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Wszystkie Twoje ogłoszenia — aktywne, zarezerwowane i archiwum.
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nowe ogłoszenie
        </Link>
      </header>

      <section className="mt-8">
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Jeszcze nie wystawiłeś/aś nic. Kliknij „Nowe ogłoszenie&rdquo; powyżej.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const sb = STATUS_BADGE[l.status];
              return (
                <li key={l.id}>
                  <Link
                    href={`/marketplace/${l.id}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-700"
                  >
                    <div className="aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-900">
                      {l.photos.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.photos[0]}
                          alt={l.title}
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400 dark:text-neutral-600">
                          <ImageOff className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-medium ${sb.tone}`}
                    >
                      {sb.label}
                    </span>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-neutral-900 group-hover:text-orange-700 dark:text-neutral-50 dark:group-hover:text-orange-400">
                          {l.title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {CATEGORY_LABELS[l.category]}
                        </span>
                      </div>
                      <div className="mt-auto flex items-end justify-between">
                        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatPLN(l.price)}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-500">
                          {CONDITION_LABELS[l.condition]}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <ListingCardActions listingId={l.id} status={l.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
