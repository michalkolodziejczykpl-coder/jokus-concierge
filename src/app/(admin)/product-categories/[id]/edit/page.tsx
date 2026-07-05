import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CategoryForm from '@/components/admin/CategoryForm';

type Cat = { id: string; name: string; slug: string; sort_order: number | null };
type PageProps = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: PageProps) {
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
  const { data: row } = await supabase
    .from('product_categories')
    .select('id, name, slug, sort_order')
    .eq('id', id)
    .maybeSingle();
  if (!row) notFound();
  const c = row as Cat;
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/product-categories"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Kategorie
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Edytuj kategorię
      </h1>
      <div className="mt-8">
        <CategoryForm
          initial={{ id: c.id, name: c.name, slug: c.slug, sort_order: c.sort_order ?? 0 }}
        />
      </div>
    </main>
  );
}
