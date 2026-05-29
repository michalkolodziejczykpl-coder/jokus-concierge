// /marketplace — neighbourhood C2C grid.
//
// Lists listings WHERE estate_id = my default address.estate_id AND status='active'
// AND seller_id != me. Future sprints add: filters, search, photos, distance.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ImageOff, Plus, Receipt, ShoppingBag, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type ListingCategory,
  type ListingCondition
} from '@/lib/types/marketplace';

type ListingRow = {
  id: string;
  title: string;
  category: ListingCategory;
  price: number;
  condition: ListingCondition;
  photos: string[];
  created_at: string;
};

export default async function MarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resident's default address gives us the estate to filter listings by.
  const { data: addrRow } = await supabase
    .from('addresses')
    .select('estate_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  const estateId = (addrRow as { estate_id?: string } | null)?.estate_id ?? null;

  if (!estateId) {
    // No default address — kick to onboarding so they can pick an estate first.
    redirect('/onboarding/address?next=/marketplace');
  }

  // Three parallel fetches: active others' listings, my listings count, my purchases count
  const [{ data: rows }, myListingsCount, myPurchasesCount] = await Promise.all([
    supabase
      .from('marketplace_listings')
      .select('id, title, category, price, condition, photos, created_at')
      .eq('estate_id', estateId)
      .eq('status', 'active')
      .neq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('marketplace_listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id),
    supabase
      .from('marketplace_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
  ]);

  const listings = (rows as unknown as ListingRow[] | null) ?? [];
  const myListingsN = myListingsCount.count ?? 0;
  const myPurchasesN = myPurchasesCount.count ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Marketplace osiedlowy
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Kup od sąsiadów — odbiór osobisty lub dostawa przez JOKUS.
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Wystaw
        </Link>
      </header>

      <nav className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/marketplace/my-listings"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-700"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Moje ogłoszenia
            </span>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 group-hover:bg-orange-100 group-hover:text-orange-700 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-orange-900/40 dark:group-hover:text-orange-300">
            {myListingsN}
          </span>
        </Link>
        <Link
          href="/marketplace/my-purchases"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-700"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <Receipt className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Moje zakupy
            </span>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 group-hover:bg-orange-100 group-hover:text-orange-700 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-orange-900/40 dark:group-hover:text-orange-300">
            {myPurchasesN}
          </span>
        </Link>
      </nav>

      <section className="mt-8">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <ShoppingBag
              className="h-10 w-10 text-neutral-400 dark:text-neutral-600"
              aria-hidden="true"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Na razie pusto — bądź pierwszy/a i wystaw coś na swoim osiedlu.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/marketplace/${l.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-700"
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
