'use client';

// Resident home: full module catalogue rendered as a tile grid, grouped by
// category. Handles its own loading and error states so the parent page can
// stay a thin Server Component.
//
// Responsive layout: 2 tiles per row on phones, 3 on tablets, 4 on desktop.
// This keeps any module reachable within one thumb-scroll on mobile, which
// directly supports CLAUDE.md's "3–4 clicks to BLIK" UX requirement.

import { useModules, groupByCategory } from '@/hooks/useModules';
import { MODULE_CATEGORY_LABELS } from '@/lib/types/modules';
import { ModuleTile } from './ModuleTile';

export function ModuleGrid() {
  const { data: modules, isLoading, isError, error, refetch } = useModules();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
          />
        ))}
        <span className="sr-only">Ładowanie modułów…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-900 dark:text-red-200">
          Nie udało się załadować listy usług.
        </p>
        <p className="mt-1 text-xs text-red-700 dark:text-red-300/80">
          {error instanceof Error ? error.message : 'Nieznany błąd.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/40"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Brak dostępnych usług w Twojej okolicy. Wracaj wkrótce!
      </p>
    );
  }

  const grouped = groupByCategory(modules);

  return (
    <div className="space-y-10">
      {grouped.map(({ category, modules: items }) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h2
            id={`cat-${category}`}
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
          >
            {MODULE_CATEGORY_LABELS[category]}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((module) => (
              <ModuleTile key={module.id} module={module} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
