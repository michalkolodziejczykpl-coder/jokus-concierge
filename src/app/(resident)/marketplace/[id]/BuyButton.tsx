'use client';

// "Kup z dostawą" — calls /api/marketplace/listings/[id]/buy which:
//   - creates a draft order with pickup_address from the listing
//   - reserves the listing
//   - creates marketplace_purchases row linking the two
//   - returns the new order_id so we can navigate to the slot picker.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { formatPLN } from '@/lib/utils/formatters';

const DELIVERY_PRICE = 5; // matches modules.base_price of 'marketplace-delivery'

type Props = {
  listingId: string;
  itemPrice: number;
};

export default function BuyButton({ listingId, itemPrice }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (data.error === 'cannot_buy_own_listing') {
          setError('Nie możesz kupić własnego ogłoszenia.');
        } else if (data.error === 'listing_not_active') {
          setError('Ogłoszenie zostało już zarezerwowane lub sprzedane.');
        } else if (data.error === 'buyer_no_default_address') {
          setError('Brak domyślnego adresu — uzupełnij w profilu.');
        } else {
          setError(data.message ?? `Nie udało się rozpocząć zakupu (${data.error ?? res.status}).`);
        }
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { order_id: string };
      router.push(`/orders/${data.order_id}/slots`);
    } catch (e) {
      console.error('[BuyButton.buy]', e);
      setError('Błąd sieci. Spróbuj ponownie.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {busy ? 'Tworzę zamówienie…' : `Kup z dostawą · ${formatPLN(itemPrice + DELIVERY_PRICE)}`}
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        W tym {formatPLN(itemPrice)} za przedmiot + {formatPLN(DELIVERY_PRICE)} za dostawę przez
        jokusora. Po kliknięciu wybierzesz termin i zapłacisz.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
