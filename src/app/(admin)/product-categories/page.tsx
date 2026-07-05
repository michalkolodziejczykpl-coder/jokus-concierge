import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DeleteButton from '@/components/admin/DeleteButton';

type Row = { id: string; name: string; slug: string };

export default async function AdminCategoriesPage() {
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
  const { data: rows } = await supabase
    .from('product_categories')
    .select('id, name, slug')
    .order('sort_order')
    .order('name');
  const cats = (rows as Row[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Produkty
      </Link>
      <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Kategorie produktów
        </h1>
        <Link
          href="/product-categories/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nowa kategoria
        </Link>
      </header>
      <section className="mt-8 space-y-2">
        {cats.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak kategorii.
          </div>
        ) : (
          cats.map((c) => (
            <article
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {c.name} <span className="text-xs text-neutral-400">/{c.slug}</span>
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/product-categories/${c.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edytuj
                </Link>
                <DeleteButton
                  url={`/api/admin/product-categories/${c.id}`}
                  confirmText={`Usunąć kategorię „${c.name}"? Produkty zostaną bez kategorii.`}
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
