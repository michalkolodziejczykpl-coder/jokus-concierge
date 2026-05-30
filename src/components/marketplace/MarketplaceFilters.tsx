'use client';

// Search + filter bar for the marketplace browse page.
// State lives in the URL (?q=&category=&condition=&maxPrice=&sort=) so the
// server component re-renders with the filtered query and links stay shareable.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  type ListingCategory,
  type ListingCondition
} from '@/lib/types/marketplace';

const SORTS = {
  newest: 'Najnowsze',
  cheapest: 'Najtańsze',
  priciest: 'Najdroższe'
} as const;

type SortKey = keyof typeof SORTS;

export default function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get('q') ?? '');

  const category = sp.get('category') ?? '';
  const condition = sp.get('condition') ?? '';
  const maxPrice = sp.get('maxPrice') ?? '';
  const sort = (sp.get('sort') as SortKey) ?? 'newest';

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply({ q });
  }

  const hasAnyFilter = Boolean(
    q || category || condition || maxPrice || (sort && sort !== 'newest')
  );

  const selectClass =
    'rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

  return (
    <div className="space-y-3">
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po nazwie…"
            aria-label="Szukaj ogłoszeń"
            className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          Szukaj
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Kategoria"
          value={category}
          onChange={(e) => apply({ category: e.target.value })}
          className={selectClass}
        >
          <option value="">Wszystkie kategorie</option>
          {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          aria-label="Stan"
          value={condition}
          onChange={(e) => apply({ condition: e.target.value })}
          className={selectClass}
        >
          <option value="">Każdy stan</option>
          {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          aria-label="Maksymalna cena"
          value={maxPrice}
          onChange={(e) => apply({ maxPrice: e.target.value })}
          className={selectClass}
        >
          <option value="">Dowolna cena</option>
          <option value="50">do 50 zł</option>
          <option value="100">do 100 zł</option>
          <option value="250">do 250 zł</option>
          <option value="500">do 500 zł</option>
          <option value="1000">do 1000 zł</option>
        </select>

        <select
          aria-label="Sortowanie"
          value={sort}
          onChange={(e) => apply({ sort: e.target.value })}
          className={selectClass}
        >
          {(Object.keys(SORTS) as SortKey[]).map((s) => (
            <option key={s} value={s}>
              {SORTS[s]}
            </option>
          ))}
        </select>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              startTransition(() => router.push(pathname));
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Wyczyść
          </button>
        )}
      </div>
    </div>
  );
}
