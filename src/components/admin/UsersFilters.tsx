'use client';

// Role filter + name/email search for the admin users list.
// State lives in the URL (?role=&q=) so the server component re-runs its query
// and the filtered view stays shareable — same pattern as MarketplaceFilters.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

const ROLES = {
  all: 'Wszyscy',
  resident: 'Mieszkańcy',
  jokusor: 'Jokusorzy',
  admin: 'Admini'
} as const;

type RoleKey = keyof typeof ROLES;

export default function UsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get('q') ?? '');

  const role = (sp.get('role') as RoleKey) ?? 'all';

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

  const hasAnyFilter = Boolean(q || (role && role !== 'all'));

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
            placeholder="Szukaj po imieniu lub e-mailu…"
            aria-label="Szukaj użytkowników"
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
          aria-label="Rola"
          value={role}
          onChange={(e) => apply({ role: e.target.value === 'all' ? '' : e.target.value })}
          className={selectClass}
        >
          {(Object.keys(ROLES) as RoleKey[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
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
