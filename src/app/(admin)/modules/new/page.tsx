import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ModuleForm from '@/components/admin/ModuleForm';

export default async function NewModulePage() {
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
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/modules"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Moduły
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Nowy moduł
      </h1>
      <div className="mt-8">
        <ModuleForm
          initial={{
            slug: '',
            name: '',
            description: '',
            category: 'shopping',
            icon_name: '',
            base_price: '',
            price_unit: 'fixed',
            estimated_duration_min: '30',
            requires_pickup: false,
            requires_age_verification: false,
            is_global: true,
            sort_order: '0'
          }}
        />
      </div>
    </main>
  );
}
