// /modules/[slug] — module detail + order draft form.
//
// Server Component: resolves session, fetches the module by slug, and gates
// on the user having a default address. If no address yet, redirects to
// onboarding with a `?next=` back to this page so the user lands here after.

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDefaultAddress } from '@/lib/auth/getDefaultAddress';
import { OrderDraftForm } from '@/components/resident/OrderDraftForm';
import { formatPLN, formatDurationMin } from '@/lib/utils/formatters';
import type { Module } from '@/lib/types/modules';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ModuleDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: moduleRow, error } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[/modules/[slug]] fetch error', error);
    throw new Error('Nie udało się załadować modułu');
  }
  if (!moduleRow) {
    notFound();
  }

  const moduleData = moduleRow as Module;

  // Onboarding gate. Send the user through /onboarding/address with a
  // `?next=` that bounces them back here once the address is saved.
  const defaultAddress = await getDefaultAddress();
  if (!defaultAddress) {
    redirect(`/onboarding/address?next=/modules/${slug}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Wszystkie usługi
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {moduleData.name}
        </h1>
        {moduleData.description && (
          <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
            {moduleData.description}
          </p>
        )}
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-neutral-500">Cena od:</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatPLN(moduleData.base_price)}
              {moduleData.price_unit === 'hourly' && '/h'}
              {moduleData.price_unit === 'per_km' && '/km'}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-neutral-500">Szacowany czas:</dt>
            <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatDurationMin(moduleData.estimated_duration_min)}
            </dd>
          </div>
        </dl>
      </header>

      <OrderDraftForm module={moduleData} />

      <p className="mt-8 text-xs text-neutral-500 dark:text-neutral-500">
        Adres dostawy: {defaultAddress.street} {defaultAddress.building}
        {defaultAddress.apartment ? `/${defaultAddress.apartment}` : ''},{' '}
        {defaultAddress.postal_code} {defaultAddress.city}
      </p>
    </main>
  );
}
