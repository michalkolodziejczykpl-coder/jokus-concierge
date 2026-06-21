'use client';

// Grocery shop (G2+G3): browse, favourite, build a cart, and check out into a
// "Zakupy" order. Cart + favourites are user-owned rows (RLS), mutated directly
// via the browser Supabase client. Checkout posts to /api/sklep/checkout, then
// routes to the slot picker (existing flow → payment).

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Minus, Plus, RotateCcw, ShoppingCart, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPLN } from '@/lib/utils/formatters';
import { categoryIcon } from '@/lib/shop/categoryIcon';

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
type Category = { id: string; name: string; slug: string | null };

type Props = {
  userId: string;
  products: Product[];
  categories: Category[];
  initialCart: { product_id: string; quantity: number }[];
  initialFavorites: string[];
  recentProducts: Product[];
};

export default function Shop({
  userId,
  products,
  categories,
  initialCart,
  initialFavorites,
  recentProducts
}: Props) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [cart, setCart] = useState<Map<string, number>>(
    () => new Map(initialCart.map((c) => [c.product_id, c.quantity]))
  );
  const [favs, setFavs] = useState<Set<string>>(() => new Set(initialFavorites));
  const [activeCat, setActiveCat] = useState<string>('');
  const [query, setQuery] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const priceById = useMemo(
    () => new Map(products.map((p) => [p.id, p.estimated_price])),
    [products]
  );
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const slugByCatId = useMemo(() => new Map(categories.map((c) => [c.id, c.slug])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat && p.category_id !== activeCat) return false;
      if (onlyFavs && !favs.has(p.id)) return false;
      if (q && !`${p.name} ${p.brand ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, activeCat, onlyFavs, favs, query]);

  const cartCount = useMemo(() => Array.from(cart.values()).reduce((a, b) => a + b, 0), [cart]);
  const cartTotal = useMemo(() => {
    let t = 0;
    for (const [id, qty] of cart) t += (priceById.get(id) ?? 0) * qty;
    return t;
  }, [cart, priceById]);

  async function setQty(productId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
    if (qty <= 0) {
      await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId);
    } else {
      await supabase
        .from('cart_items')
        .upsert({ user_id: userId, product_id: productId, quantity: qty } as never, {
          onConflict: 'user_id,product_id'
        });
    }
  }

  async function toggleFav(productId: string) {
    const has = favs.has(productId);
    setFavs((prev) => {
      const next = new Set(prev);
      if (has) next.delete(productId);
      else next.add(productId);
      return next;
    });
    if (has) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', productId);
    } else {
      await supabase.from('favorites').insert({ user_id: userId, product_id: productId } as never);
    }
  }

  async function checkout() {
    if (checkingOut || cartCount === 0) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/sklep/checkout', { method: 'POST' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setCheckoutError(
          d.error === 'no_default_address'
            ? 'Najpierw ustaw adres dostawy w profilu.'
            : `Nie udało się złożyć zamówienia (${d.error ?? res.status}).`
        );
        setCheckingOut(false);
        return;
      }
      const { order_id } = (await res.json()) as { order_id: string };
      router.push(`/orders/${order_id}/slots`);
    } catch {
      setCheckoutError('Błąd sieci.');
      setCheckingOut(false);
    }
  }

  const pill = 'rounded-full px-3 py-1.5 text-sm font-medium transition border';
  const pillOn = 'border-orange-500 bg-orange-600 text-white';
  const pillOff =
    'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900';

  return (
    <div className="pb-28">
      {recentProducts.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <RotateCcw className="h-4 w-4 text-orange-600" aria-hidden="true" />
            Ostatnio kupione
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setQty(p.id, (cart.get(p.id) ?? 0) + 1)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
              >
                <Plus className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj produktu…"
          aria-label="Szukaj produktu"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCat('')}
            className={`${pill} ${activeCat === '' ? pillOn : pillOff}`}
          >
            Wszystko
          </button>
          {categories.map((c) => {
            const Icon = categoryIcon(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`${pill} inline-flex items-center gap-1.5 ${
                  activeCat === c.id ? pillOn : pillOff
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {c.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOnlyFavs((v) => !v)}
            className={`${pill} inline-flex items-center gap-1 ${onlyFavs ? pillOn : pillOff}`}
          >
            <Heart className={`h-4 w-4 ${onlyFavs ? 'fill-white' : ''}`} aria-hidden="true" />
            Ulubione
          </button>
        </div>
      </div>

      <section className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak produktów pasujących do filtrów.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const qty = cart.get(p.id) ?? 0;
              const fav = favs.has(p.id);
              const Icon = categoryIcon(p.category_id ? slugByCatId.get(p.category_id) : null);
              const hasDiscount = p.old_price != null && p.old_price > p.estimated_price;
              const discountPct = hasDiscount
                ? Math.round((1 - p.estimated_price / (p.old_price as number)) * 100)
                : 0;
              return (
                <li
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-900">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-orange-50 to-neutral-100 text-orange-300 dark:from-neutral-900 dark:to-neutral-900 dark:text-neutral-700">
                        <Icon className="h-12 w-12" aria-hidden="true" />
                      </div>
                    )}
                    {hasDiscount ? (
                      <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                        -{discountPct}%
                      </span>
                    ) : p.badge === 'hit' ? (
                      <span className="absolute left-2 top-2 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                        Hit
                      </span>
                    ) : p.badge === 'promo' ? (
                      <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                        Promo
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleFav(p.id)}
                      aria-label={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow dark:bg-neutral-900/90"
                    >
                      <Heart
                        className={`h-4 w-4 ${fav ? 'fill-red-500 text-red-500' : 'text-neutral-500'}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                        {p.name}
                      </p>
                      {p.brand && <p className="text-xs text-neutral-500">{p.brand}</p>}
                    </div>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {formatPLN(p.estimated_price)}
                      {hasDiscount && (
                        <span className="ml-1.5 text-xs font-normal text-neutral-400 line-through">
                          {formatPLN(p.old_price as number)}
                        </span>
                      )}{' '}
                      <span className="text-xs font-normal text-neutral-500">/ {p.unit}</span>
                    </p>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(p.id, 1)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" /> Dodaj
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-orange-300 dark:border-orange-800/50">
                        <button
                          type="button"
                          onClick={() => setQty(p.id, qty - 1)}
                          aria-label="Mniej"
                          className="grid h-9 w-9 place-items-center text-orange-700 dark:text-orange-300"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(p.id, qty + 1)}
                          aria-label="Więcej"
                          className="grid h-9 w-9 place-items-center text-orange-700 dark:text-orange-300"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setCartOpen((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              <ShoppingCart className="h-5 w-5 text-orange-600" aria-hidden="true" />
              {cartCount} {cartCount === 1 ? 'rzecz' : 'rzeczy'} · ~{formatPLN(cartTotal)}
              <span className="text-xs text-neutral-500">({cartOpen ? 'ukryj' : 'pokaż'})</span>
            </button>
            <button
              type="button"
              onClick={checkout}
              disabled={checkingOut}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {checkingOut ? 'Składam…' : 'Zamów'}
            </button>
          </div>

          {checkoutError && (
            <p
              className="mx-auto max-w-5xl px-4 pb-2 text-right text-xs text-red-600 dark:text-red-400 sm:px-6"
              role="alert"
            >
              {checkoutError}
            </p>
          )}

          {cartOpen && (
            <div className="mx-auto max-h-72 max-w-5xl overflow-y-auto border-t border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
              <ul className="space-y-2">
                {Array.from(cart.entries()).map(([id, qty]) => {
                  const p = productById.get(id);
                  if (!p) return null;
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                        {p.name} <span className="text-neutral-500">× {qty}</span>
                      </span>
                      <span className="shrink-0 text-neutral-600 dark:text-neutral-400">
                        {formatPLN(p.estimated_price * qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(id, 0)}
                        aria-label="Usuń"
                        className="shrink-0 text-neutral-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-neutral-500">
                Ceny są orientacyjne — ostateczna kwota wg paragonu po zakupach jokusora. Doliczana
                jest opłata za usługę.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
