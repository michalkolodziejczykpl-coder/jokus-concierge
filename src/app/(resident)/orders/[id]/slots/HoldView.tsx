'use client';

// Hold confirmation view + 90s countdown + placeholder BLIK button.
//
// Two ways the hold ends:
//   1. User clicks "Anuluj" → DELETE /api/slots/hold/[id] → router.refresh()
//      → page sees order.status='draft' → falls back to <SlotGrid>.
//   2. Countdown hits 0 → same DELETE call (auto). Same end state.
//
// The "Zapłać BLIK" button is a placeholder for sprint 3c (Przelewy24 init).

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import {
  formatCountdown,
  formatDayHeader,
  formatPLN,
  formatSlotRange
} from '@/lib/utils/formatters';

type Props = {
  orderId: string;
  timeSlotId: string;
  holdExpiresAt: string;
  scheduledAt: string;
  slotEndAt: string;
  jokusorName: string | null;
  totalPrice: number;
};

function computeSecondsLeft(holdExpiresAt: string): number {
  return Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000);
}

export default function HoldView({
  orderId,
  timeSlotId,
  holdExpiresAt,
  scheduledAt,
  slotEndAt,
  jokusorName,
  totalPrice
}: Props) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(holdExpiresAt));
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const expiredHandledRef = useRef(false);

  // Tick the countdown
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(holdExpiresAt));
    }, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  // Auto-cancel on expiry (idempotent — server treats double-cancel as no-op)
  useEffect(() => {
    if (secondsLeft > 0 || expiredHandledRef.current) return;
    expiredHandledRef.current = true;
    void cancelHold(/*viaCountdown=*/ true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  async function cancelHold(viaCountdown = false) {
    if (cancelling && !viaCountdown) return;
    setCancelling(true);
    try {
      await fetch(`/api/slots/hold/${timeSlotId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('[HoldView.cancelHold]', e);
    } finally {
      startTransition(() => router.refresh());
    }
  }

  async function mockPay() {
    if (paying || cancelling || expired) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/payments/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setPayError(data.message ?? `Nie udało się zapłacić (${data.error ?? res.status}).`);
        setPaying(false);
        return;
      }
      // Order is now 'pending' — bounce to its status page.
      router.push(`/orders/${orderId}`);
    } catch (e) {
      console.error('[HoldView.mockPay]', e);
      setPayError('Błąd sieci. Spróbuj ponownie.');
      setPaying(false);
    }
  }

  const expired = secondsLeft <= 0;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border-2 border-green-500/40 bg-green-50 p-6 dark:border-green-500/30 dark:bg-green-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-green-900 dark:text-green-100">
              Slot zarezerwowany
            </h2>
            <p className="mt-1 text-sm text-green-800 dark:text-green-200/90">
              {formatDayHeader(scheduledAt)} · {formatSlotRange(scheduledAt, slotEndAt)}
              {jokusorName ? ` · ${jokusorName}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/40 dark:bg-orange-950/30">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-orange-700 dark:text-orange-300" />
          <p className="flex-1 text-sm text-orange-900 dark:text-orange-200">
            {expired ? (
              <>Hold wygasł — wracamy do wyboru terminu…</>
            ) : (
              <>
                Masz <strong className="font-mono text-base">{formatCountdown(secondsLeft)}</strong>{' '}
                na potwierdzenie płatności.
              </>
            )}
          </p>
        </div>
      </div>

      {payError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {payError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={mockPay}
          disabled={expired || cancelling || paying}
          className="flex-1 rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paying ? 'Płacę…' : `Zapłać BLIK · ${formatPLN(totalPrice)}`}
        </button>
        <button
          type="button"
          onClick={() => cancelHold(false)}
          disabled={cancelling || paying}
          className="rounded-xl border border-neutral-300 px-6 py-3 text-base font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          Anuluj
        </button>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Płatność BLIK to obecnie mock (sprint 4) — po kliknięciu zlecenie idzie do akceptacji
        przez jokusora. Sprint 3c podmieni mock na realny przekierowanie do Przelewy24.
      </p>
    </section>
  );
}
