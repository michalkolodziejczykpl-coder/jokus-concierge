import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ImageOff, Layers, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import DeleteButton from '@/components/admin/DeleteButton';

type Row = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  estimated_price: number;
  is_active: boolean;
  image_url: string | null;
  category_id: string | null;
};
type Cat = { id: string; name: string };

export default async function AdminProductsPage() {
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

  const [{ data: rows }, { data: cats }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, brand, unit, estimated_price, is_active, image_url, category_id')
      .order('sort_order')
      .order('name'),
    supabase.from('product_categories').select('id, name')
  ]);
  const products = (rows as unknown as Row[] | null) ?? [];
  const catMap = new Map(((cats as unknown as Cat[] | null) ?? []).map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Panel
      </Link>
      <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Produkty
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/product-categories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Layers className="h-4 w-4" aria-hidden="true" /> Kategorie
          </Link>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Nowy produkt
          </Link>
        </div>
      </header>

      <section className="mt-8 space-y-3">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak produktów. Dodaj pierwszy.
          </div>
        ) : (
          products.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-neutral-400">
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {p.name}
                    {!p.is_active && (
                      <span className="ml-2 text-xs font-medium text-neutral-400">(ukryty)</span>
                    )}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {p.category_id ? (catMap.get(p.category_id) ?? '—') : 'bez kategorii'} ·{' '}
                    {formatPLN(p.estimated_price)} / {p.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${p.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edytuj
                </Link>
                <DeleteButton
                  url={`/api/admin/products/${p.id}`}
                  confirmText={`Usunąć produkt „${p.name}"?`}
                  inUseMessage="Nie można usunąć — produkt jest w zamówieniach. Odznacz „dostępny” zamiast usuwać."
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
