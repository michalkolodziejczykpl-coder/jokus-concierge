// /sklep — grocery shop (resident). Browse the catalog, favourite, build a cart,
// check out into a "Zakupy" order. Shows a "recently bought" quick-add row.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Shop from '@/components/resident/Shop';

type Category = { id: string; name: string; slug: string | null };
type Product = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  estimated_price: number;
  image_url: string | null;
  category_id: string | null;
  old_price: number | null;
  badge: string | null;
};

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: cats },
    { data: prods },
    { data: cartRows },
    { data: favRows },
    { data: recentRows }
  ] = await Promise.all([
    supabase.from('product_categories').select('id, name, slug').order('sort_order').order('name'),
    supabase
      .from('products')
      .select('id, name, brand, unit, estimated_price, image_url, category_id, old_price, badge')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase.from('cart_items').select('product_id, quantity').eq('user_id', user.id),
    supabase.from('favorites').select('product_id').eq('user_id', user.id),
    supabase
      .from('order_items')
      .select('product_id, created_at, orders!inner(resident_id)')
      .eq('orders.resident_id', user.id)
      .not('product_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40)
  ]);

  const categories = (cats as Category[] | null) ?? [];
  const products = (prods as unknown as Product[] | null) ?? [];
  const initialCart = (cartRows as { product_id: string; quantity: number }[] | null) ?? [];
  const initialFavorites = ((favRows as { product_id: string }[] | null) ?? []).map(
    (f) => f.product_id
  );

  // Recently bought: distinct product ids (newest first) → product objects that
  // are still in the active catalog.
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const recentProducts: Product[] = [];
  for (const r of (recentRows as { product_id: string | null }[] | null) ?? []) {
    const pid = r.product_id;
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    const p = byId.get(pid);
    if (p) recentProducts.push(p);
    if (recentProducts.length >= 10) break;
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Zakupy spożywcze
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Złóż koszyk, a jokusor zrobi zakupy i dostarczy pod drzwi.
        </p>
      </header>

      <div className="mt-6">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Sklep jest jeszcze pusty — wkrótce pojawią się produkty.
          </div>
        ) : (
          <Shop
            userId={user.id}
            products={products}
            categories={categories}
            initialCart={initialCart}
            initialFavorites={initialFavorites}
            recentProducts={recentProducts}
          />
        )}
      </div>
    </main>
  );
}
