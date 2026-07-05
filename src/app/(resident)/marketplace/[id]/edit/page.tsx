// /marketplace/[id]/edit — edit own listing. Only the seller may open it.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { type ListingRow } from '@/lib/types/marketplace';
import EditListingForm from './EditListingForm';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row, error } = await supabase
    .from('marketplace_listings')
    .select(
      'id, seller_id, title, description, category, price, condition, delivery_option, status'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[/marketplace/[id]/edit] fetch', error);
    throw new Error('Nie udało się załadować ogłoszenia');
  }
  if (!row) notFound();

  const listing = row as ListingRow;
  // Only the owner can edit; others get a 404 (don't reveal it exists to edit).
  if (listing.seller_id !== user.id) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href={`/marketplace/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Wróć do ogłoszenia
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Edytuj ogłoszenie
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Zdjęć i adresu odbioru nie zmienisz tutaj — utwórz nowe ogłoszenie, jeśli trzeba je
        podmienić.
      </p>

      <div className="mt-8">
        <EditListingForm
          listingId={listing.id}
          initial={{
            title: listing.title,
            description: listing.description ?? '',
            category: listing.category,
            price: listing.price,
            condition: listing.condition,
            delivery_option: listing.delivery_option
          }}
        />
      </div>
    </main>
  );
}
