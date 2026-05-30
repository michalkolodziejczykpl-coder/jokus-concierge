// /marketplace/new — listing creation form.
// Server component prefills the pickup address from the seller's default
// address (if any). Client handles validation + submit.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import NewListingForm from './NewListingForm';
import type { PickupAddress } from '@/lib/types/marketplace';

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: addrRow } = await supabase
    .from('addresses')
    .select('street, building, apartment, city, postal_code, estate_id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  const addr = addrRow as (PickupAddress & { estate_id: string | null }) | null;

  if (!addr?.estate_id) {
    // No default address → need it both to know estate AND pre-fill pickup
    redirect('/onboarding/address?next=/marketplace/new');
  }

  const prefill: PickupAddress = {
    street: addr.street,
    building: addr.building,
    apartment: addr.apartment ?? null,
    city: addr.city,
    postal_code: addr.postal_code
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Marketplace
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Nowe ogłoszenie
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          Sprzedasz coś sąsiadom z osiedla — z opcją odbioru przez jokusora.
        </p>
      </header>

      <NewListingForm prefillPickup={prefill} userId={user.id} />
    </main>
  );
}
