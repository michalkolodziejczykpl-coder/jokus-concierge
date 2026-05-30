'use client';

// Shown to the resident on a COMPLETED order: rate the jokusor (1-5 + comment)
// and leave a tip. Tip payment is a MOCK until Przelewy24 (sprint 3c).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { ratingSchema, tipSchema } from '@/lib/utils/validators';

type Props = {
  orderId: string;
  existingStars: number | null;
  existingComment: string | null;
  tippedTotal: number;
};

const TIP_PRESETS = [5, 10, 20];

function formatPln(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} zł`;
}

export default function RatingTip({ orderId, existingStars, existingComment, tippedTotal }: Props) {
  const router = useRouter();

  // Rating state
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);

  // Tip state
  const [tipAmount, setTipAmount] = useState<string>('');
  const [tipBusy, setTipBusy] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  async function submitRating() {
    if (ratingBusy) return;
    const valid = ratingSchema.safeParse({ stars, comment });
    if (!valid.success) {
      setRatingError(valid.error.flatten().fieldErrors.stars?.[0] ?? 'Wybierz ocenę.');
      return;
    }
    setRatingBusy(true);
    setRatingError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setRatingError(`Nie udało się zapisać oceny (${d.error ?? res.status}).`);
        setRatingBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setRatingError('Błąd sieci.');
      setRatingBusy(false);
    }
  }

  async function submitTip(amount: number) {
    if (tipBusy) return;
    const valid = tipSchema.safeParse({ amount });
    if (!valid.success) {
      setTipError(valid.error.flatten().fieldErrors.amount?.[0] ?? 'Niepoprawna kwota.');
      return;
    }
    setTipBusy(true);
    setTipError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.data)
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setTipError(`Nie udało się dać napiwku (${d.error ?? res.status}).`);
        setTipBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setTipError('Błąd sieci.');
      setTipBusy(false);
    }
  }

  const alreadyRated = existingStars !== null;

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      {/* Rating */}
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {alreadyRated ? 'Twoja ocena' : 'Oceń jokusora'}
        </h2>
        {alreadyRated ? (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-6 w-6 ${n <= (existingStars ?? 0) ? 'fill-orange-500 text-orange-500' : 'text-neutral-300 dark:text-neutral-700'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            {existingComment && (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                „{existingComment}"
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex gap-1" role="radiogroup" aria-label="Ocena w gwiazdkach">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} gwiazdek`}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-8 w-8 transition ${
                      n <= (hover || stars)
                        ? 'fill-orange-500 text-orange-500'
                        : 'text-neutral-300 dark:text-neutral-700'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Komentarz (opcjonalnie)"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
            {ratingError && <p className="text-xs text-red-600 dark:text-red-400">{ratingError}</p>}
            <button
              type="button"
              onClick={submitRating}
              disabled={ratingBusy}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {ratingBusy ? 'Zapisuję…' : 'Wyślij ocenę'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800" />

      {/* Tip */}
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Napiwek</h2>
        {tippedTotal > 0 ? (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            Dziękujemy! Przekazany napiwek: <strong>{formatPln(tippedTotal)}</strong>.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Zadowolony/a z usługi? Możesz docenić jokusora napiwkiem.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {TIP_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => submitTip(amt)}
                  disabled={tipBusy}
                  className="rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50 dark:border-orange-800/50 dark:text-orange-300 dark:hover:bg-orange-950/30"
                >
                  {amt} zł
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="Inna"
                  className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => submitTip(Number(tipAmount))}
                  disabled={tipBusy || !tipAmount}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {tipBusy ? 'Wysyłam…' : 'Daj napiwek'}
                </button>
              </div>
            </div>
            {tipError && <p className="text-xs text-red-600 dark:text-red-400">{tipError}</p>}
            <p className="text-xs text-neutral-500">
              Płatność napiwku to obecnie wersja testowa (mock) — prawdziwe płatności po wdrożeniu
              Przelewy24.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
