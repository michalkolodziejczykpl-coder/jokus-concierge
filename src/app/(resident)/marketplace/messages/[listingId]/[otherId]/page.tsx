// /marketplace/messages/[listingId]/[otherId] — one conversation.
// Used by the inbox (either party) and reachable for sellers replying to buyers.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Conversation from '@/components/marketplace/Conversation';

type PageProps = { params: Promise<{ listingId: string; otherId: string }> };

export default async function ConversationPage({ params }: PageProps) {
  const { listingId, otherId } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (otherId === user.id) redirect('/marketplace/messages');

  // Listing may be hidden by RLS (e.g. a sold listing I don't own) — handle null.
  const { data: row } = await supabase
    .from('marketplace_listings')
    .select('id, title, seller_id')
    .eq('id', listingId)
    .maybeSingle();

  const listing = row as { id: string; title: string; seller_id: string } | null;
  const iAmSeller = listing ? listing.seller_id === user.id : false;
  const otherLabel = !listing ? 'Rozmówca' : iAmSeller ? 'Kupujący' : 'Sprzedawca';

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace/messages"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Wiadomości
      </Link>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {listing?.title ?? 'Ogłoszenie niedostępne'}
        </h1>
        {listing && (
          <Link
            href={`/marketplace/${listing.id}`}
            className="shrink-0 text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            Zobacz ogłoszenie
          </Link>
        )}
      </div>

      <div className="mt-6">
        <Conversation
          listingId={listingId}
          otherId={otherId}
          meId={user.id}
          otherLabel={otherLabel}
        />
      </div>
    </main>
  );
}
