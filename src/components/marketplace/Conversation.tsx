'use client';

// Buyer <-> seller conversation about one listing.
// - Loads the thread (RLS: only the two participants can read).
// - Marks incoming messages as read on view.
// - Polls every 5s so replies show up without a manual refresh.
// - Sends via POST /api/marketplace/messages.
//
// Counterpart is labelled by role (Sprzedawca / Kupujący) — we never fetch the
// other user's profile, which keeps us clear of the users-table RLS.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Props = {
  listingId: string;
  otherId: string;
  meId: string;
  otherLabel: string;
};

function formatTime(iso: string): string {
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

export default function Conversation({ listingId, otherId, meId, otherLabel }: Props) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadAndMarkRead = useCallback(async () => {
    const { data, error: loadErr } = await supabase
      .from('marketplace_messages')
      .select('id, sender_id, recipient_id, content, read_at, created_at')
      .eq('listing_id', listingId)
      .or(
        `and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`
      )
      .order('created_at', { ascending: true });

    if (loadErr) {
      console.error('[Conversation.load]', loadErr);
      return;
    }
    const rows = (data as Message[] | null) ?? [];
    setMessages(rows);

    const hasUnread = rows.some((m) => m.recipient_id === meId && m.read_at === null);
    if (hasUnread) {
      await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('listing_id', listingId)
        .eq('sender_id', otherId)
        .eq('recipient_id', meId)
        .is('read_at', null);
    }
  }, [supabase, listingId, meId, otherId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadAndMarkRead();
      if (active) setLoading(false);
    })();
    const id = setInterval(() => {
      void loadAndMarkRead();
    }, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [loadAndMarkRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, recipient_id: otherId, content })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Nie udało się wysłać (${data.error ?? res.status}).`);
        setSending(false);
        return;
      }
      setText('');
      await loadAndMarkRead();
    } catch {
      setError('Błąd sieci.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
        Wiadomości · {otherLabel}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-neutral-500">Wczytuję…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-500">
            Brak wiadomości. Napisz pierwszą, aby dopytać o szczegóły.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-orange-600 text-white'
                      : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${mine ? 'text-orange-100' : 'text-neutral-500 dark:text-neutral-400'}`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Napisz wiadomość…"
          aria-label="Treść wiadomości"
          className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <button
          type="submit"
          disabled={sending || text.trim().length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {sending ? 'Wysyłam…' : 'Wyślij'}
        </button>
      </form>

      {error && (
        <p className="px-4 pb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
