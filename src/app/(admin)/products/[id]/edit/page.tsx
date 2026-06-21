import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

type Cat = { id: string; name: string };
type Prod = {
  id: string;
  category_id: string | null;
  name: string;
  brand: string | null;
  unit: string;
  estimated_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
  old_price: number | null;
  badge: string | null;
};
type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
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

  const [{ data: row }, { data: cats }] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, category_id, name, brand, unit, estimated_price, image_url, is_active, sort_order, old_price, badge'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('product_categories').select('id, name').order('sort_order').order('name')
  ]);
  if (!row) notFound();
  const p = row as unknown as Prod;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Produkty
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Edytuj produkt
      </h1>
      <div className="mt-8">
        <ProductForm
          categories={(cats as Cat[] | null) ?? []}
          initial={{
            id: p.id,
            category_id: p.category_id,
            name: p.name,
            brand: p.brand ?? '',
            unit: p.unit,
            estimated_price: p.estimated_price,
            image_url: p.image_url ?? '',
            is_active: p.is_active,
            sort_order: p.sort_order ?? 0,
            old_price: p.old_price ?? '',
            badge: p.badge ?? ''
          }}
        />
      </div>
    </main>
  );
}
