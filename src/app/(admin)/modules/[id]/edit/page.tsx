import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ModuleForm from '@/components/admin/ModuleForm';
import type { Module } from '@/lib/types/modules';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditModulePage({ params }: PageProps) {
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
    .from('modules')
    .select(
      'id, slug, name, description, category, icon_name, base_price, price_unit, estimated_duration_min, requires_pickup, requires_age_verification, is_global, sort_order'
    )
    .eq('id', id)
    .maybeSingle();
  if (!row) notFound();
  const m = row as unknown as Module;

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
        Edytuj moduł
      </h1>
      <div className="mt-8">
        <ModuleForm
          initial={{
            id: m.id,
            slug: m.slug,
            name: m.name,
            description: m.description ?? '',
            category: m.category,
            icon_name: m.icon_name ?? '',
            base_price: m.base_price,
            price_unit: m.price_unit,
            estimated_duration_min: m.estimated_duration_min,
            requires_pickup: m.requires_pickup,
            requires_age_verification: m.requires_age_verification,
            is_global: m.is_global,
            sort_order: m.sort_order ?? 0
          }}
        />
      </div>
    </main>
  );
}
