// /marketplace/messages — inbox. Groups my messages into conversations
// (one per listing + counterpart), newest first, with an unread badge.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, MessagesSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type ListingJoin = { id: string; title: string; seller_id: string; status: string } | null;

type Row = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  listing: ListingJoin;
};

type Conversation = {
  listingId: string;
  otherId: string;
  listingTitle: string | null;
  otherLabel: string;
  lastContent: string;
  lastAt: string;
  unread: number;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('marketplace_messages')
    .select(
      'id, listing_id, sender_id, recipient_id, content, read_at, created_at, listing:marketplace_listings(id, title, seller_id, status)'
    )
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    console.error('[/marketplace/messages] fetch', error);
    throw new Error('Nie udało się załadować wiadomości');
  }

  const rows = (data as unknown as Row[] | null) ?? [];

  // Group by (listing, counterpart). Rows are newest-first, so the first row
  // seen for a key is the latest message.
  const map = new Map<string, Conversation>();
  for (const r of rows) {
    const otherId = r.sender_id === user.id ? r.recipient_id : r.sender_id;
    const key = `${r.listing_id}::${otherId}`;
    const iAmSeller = r.listing ? r.listing.seller_id === user.id : false;
    const label = !r.listing ? 'Rozmówca' : iAmSeller ? 'Kupujący' : 'Sprzedawca';
    const isUnread = r.recipient_id === user.id && r.read_at === null;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        listingId: r.listing_id,
        otherId,
        listingTitle: r.listing?.title ?? null,
        otherLabel: label,
        lastContent: r.content,
        lastAt: r.created_at,
        unread: isUnread ? 1 : 0
      });
    } else if (isUnread) {
      existing.unread += 1;
    }
  }

  const conversations = Array.from(map.values());

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Marketplace
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Wiadomości
      </h1>

      <section className="mt-8">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <MessagesSquare
              className="h-10 w-10 text-neutral-400 dark:text-neutral-600"
              aria-hidden="true"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Brak wiadomości. Napisz do sprzedawcy z poziomu ogłoszenia.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {conversations.map((c) => (
              <li key={`${c.listingId}::${c.otherId}`}>
                <Link
                  href={`/marketplace/messages/${c.listingId}/${c.otherId}`}
                  className="flex items-start justify-between gap-3 bg-white px-4 py-4 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {c.listingTitle ?? 'Ogłoszenie niedostępne'}
                      </span>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {c.otherLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
                      {c.lastContent}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-neutral-400">{formatWhen(c.lastAt)}</span>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1.5 text-xs font-semibold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
