// /sklep — grocery shop (resident). Browse the catalog, favourite, build a cart.
// Checkout into a "Zakupy" order comes in G3.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Shop from '@/components/resident/Shop';

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  estimated_price: number;
  image_url: string | null;
  category_id: string | null;
};

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: cats }, { data: prods }, { data: cartRows }, { data: favRows }] =
    await Promise.all([
      supabase.from('product_categories').select('id, name').order('sort_order').order('name'),
      supabase
        .from('products')
        .select('id, name, brand, unit, estimated_price, image_url, category_id')
        .eq('is_active', true)
        .order('sort_order')
        .order('name'),
      supabase.from('cart_items').select('product_id, quantity').eq('user_id', user.id),
      supabase.from('favorites').select('product_id').eq('user_id', user.id)
    ]);

  const categories = (cats as Category[] | null) ?? [];
  const products = (prods as unknown as Product[] | null) ?? [];
  const initialCart = (cartRows as { product_id: string; quantity: number }[] | null) ?? [];
  const initialFavorites = ((favRows as { product_id: string }[] | null) ?? []).map(
    (f) => f.product_id
  );

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
          />
        )}
      </div>
    </main>
  );
}
