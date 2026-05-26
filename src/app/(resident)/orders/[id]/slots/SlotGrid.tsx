'use client';

// Grid of available time slots, grouped by day.
//
// Click a slot → POST /api/slots/hold → router.refresh().
// The server component decides what to render next based on order.status,
// so on success we simply re-fetch the same URL and the page swaps to
// <HoldView> automatically.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDayHeader, formatSlotRange, dayKey } from '@/lib/utils/formatters';

type Slot = {
  jokusor_id: string;
  jokusor_name: string | null;
  slot_start: string;
  slot_end: string;
};

type Props = {
  orderId: string;
  slots: Slot[];
};

export default function SlotGrid({ orderId, slots }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickingKey, setPickingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group slots by day (YYYY-MM-DD in Warsaw TZ)
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = dayKey(s.slot_start);
    const bucket = byDay.get(k);
    if (bucket) bucket.push(s);
    else byDay.set(k, [s]);
  }
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  async function pickSlot(slot: Slot) {
    setError(null);
    const slotKey = `${slot.jokusor_id}|${slot.slot_start}`;
    setPickingKey(slotKey);

    try {
      const res = await fetch('/api/slots/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          jokusor_id: slot.jokusor_id,
          slot_start: slot.slot_start,
          slot_end: slot.slot_end
        })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error === 'slot_conflict') {
          setError('Ten slot zajął ktoś inny — odśwież listę.');
        } else if (data.error === 'order_not_draft') {
          // Order is already past draft (maybe stale tab). Re-fetch.
          startTransition(() => router.refresh());
          return;
        } else {
          setError(`Nie udało się zarezerwować slotu (${data.error ?? res.status}).`);
        }
        setPickingKey(null);
        return;
      }

      // Success: refresh server component → it now sees order.status='hold'
      // and renders <HoldView> with the countdown.
      startTransition(() => router.refresh());
    } catch (e) {
      console.error('[SlotGrid.pickSlot]', e);
      setError('Błąd sieci. Spróbuj ponownie.');
      setPickingKey(null);
    }
  }

  if (slots.length === 0) {
    return (
      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
        <p className="font-semibold">Brak wolnych terminów</p>
        <p className="mt-1">
          W ciągu najbliższych 7 dni nie znaleźliśmy żadnego jokusora, który mógłby zrealizować
          zlecenie pod Twoim adresem. Spróbuj ponownie później.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Wybierz termin
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="space-y-6">
        {days.map(([dKey, daySlots]) => (
          <div key={dKey}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {formatDayHeader(daySlots[0].slot_start)}
            </h3>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => {
                const k = `${s.jokusor_id}|${s.slot_start}`;
                const disabled = isPending || pickingKey !== null;
                const isPickingThis = pickingKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pickSlot(s)}
                    disabled={disabled}
                    className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-orange-500 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                  >
                    {isPickingThis ? 'Rezerwuję…' : formatSlotRange(s.slot_start, s.slot_end)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-500">
        Po kliknięciu slot zostanie zarezerwowany na 90 sekund — w tym czasie potwierdzasz
        płatność BLIK.
      </p>
    </section>
  );
}
