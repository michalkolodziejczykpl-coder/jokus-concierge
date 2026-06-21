import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

type Cat = { id: string; name: string };

export default async function NewProductPage() {
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
  const { data: cats } = await supabase
    .from('product_categories')
    .select('id, name')
    .order('sort_order')
    .order('name');

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Produkty
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Nowy produkt
      </h1>
      <div className="mt-8">
        <ProductForm
          categories={(cats as Cat[] | null) ?? []}
          initial={{
            category_id: null,
            name: '',
            brand: '',
            unit: 'szt.',
            estimated_price: '',
            image_url: '',
            is_active: true,
            sort_order: '0',
            old_price: '',
            badge: ''
          }}
        />
      </div>
    </main>
  );
}
