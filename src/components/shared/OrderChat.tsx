'use client';

// In-app chat for one order (resident <-> assigned jokusor).
// order_messages RLS limits rows to the two participants, so a simple
// .eq('order_id', ...) returns exactly this conversation. Polls every 5s,
// marks incoming read, sends via POST /api/orders/[id]/messages.

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

type Props = { orderId: string; meId: string; otherLabel: string };

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

export default function OrderChat({ orderId, meId, otherLabel }: Props) {
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
      .from('order_messages')
      .select('id, sender_id, recipient_id, content, read_at, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (loadErr) {
      console.error('[OrderChat.load]', loadErr);
      return;
    }
    const rows = (data as Message[] | null) ?? [];
    setMessages(rows);

    if (rows.some((m) => m.recipient_id === meId && m.read_at === null)) {
      await supabase
        .from('order_messages')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('order_id', orderId)
        .eq('recipient_id', meId)
        .is('read_at', null);
    }
  }, [supabase, orderId, meId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadAndMarkRead();
      if (active) setLoading(false);
    })();
    const id = setInterval(() => void loadAndMarkRead(), 5000);
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
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Nie udało się wysłać (${d.error ?? res.status}).`);
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
        Czat · {otherLabel}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-neutral-500">Wczytuję…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-500">
            Brak wiadomości. Napisz, aby ustalić szczegóły zlecenia.
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
