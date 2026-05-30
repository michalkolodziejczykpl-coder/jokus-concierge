// /modules (admin) — list + manage service modules.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import {
  MODULE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  type ModuleCategory,
  type PriceUnit
} from '@/lib/types/modules';
import DeleteButton from '@/components/admin/DeleteButton';

type Row = {
  id: string;
  name: string;
  slug: string;
  category: ModuleCategory;
  base_price: number;
  price_unit: PriceUnit;
  is_global: boolean;
  sort_order: number | null;
};

export default async function AdminModulesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/home');

  const { data: rows, error } = await supabase
    .from('modules')
    .select('id, name, slug, category, base_price, price_unit, is_global, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error('[/admin/modules] fetch', error);
    throw new Error('Nie udało się załadować modułów');
  }
  const modules = (rows as unknown as Row[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Panel
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Moduły usług
        </h1>
        <Link
          href="/modules/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nowy moduł
        </Link>
      </header>

      <section className="mt-8 space-y-3">
        {modules.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak modułów. Dodaj pierwszy.
          </div>
        ) : (
          modules.map((m) => (
            <article
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {m.name}
                </h2>
                <p className="text-sm text-neutral-500">
                  {MODULE_CATEGORY_LABELS[m.category]} · {formatPLN(m.base_price)} (
                  {PRICE_UNIT_LABELS[m.price_unit]}){!m.is_global && ' · tylko wybrane osiedla'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/modules/${m.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edytuj
                </Link>
                <DeleteButton
                  url={`/api/admin/modules/${m.id}`}
                  confirmText={`Usunąć moduł „${m.name}"?`}
                  inUseMessage="Nie można usunąć — moduł ma powiązane zlecenia. Rozważ ukrycie zamiast usuwania."
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
