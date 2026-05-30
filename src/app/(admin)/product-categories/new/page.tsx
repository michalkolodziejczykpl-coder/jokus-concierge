import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CategoryForm from '@/components/admin/CategoryForm';

export default async function NewCategoryPage() {
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
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/product-categories"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Kategorie
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Nowa kategoria
      </h1>
      <div className="mt-8">
        <CategoryForm initial={{ name: '', slug: '', sort_order: '0' }} />
      </div>
    </main>
  );
}
