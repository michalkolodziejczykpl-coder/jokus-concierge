'use client';

// Per-estate module activation + price override matrix.
// Each row PUTs to /api/admin/estates/[id]/activations independently.

import { useState } from 'react';
import { Check } from 'lucide-react';

type Row = {
  module_id: string;
  name: string;
  base_price: number;
  active: boolean;
  price_override: number | null;
};

function RowItem({ estateId, row }: { estateId: string; row: Row }) {
  const [active, setActive] = useState(row.active);
  const [override, setOverride] = useState<string>(
    row.price_override === null ? '' : String(row.price_override)
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    const trimmed = override.trim();
    const price_override = trimmed === '' ? null : Number(trimmed);
    try {
      const res = await fetch(`/api/admin/estates/${estateId}/activations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: row.module_id, active, price_override })
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(`Błąd (${d.error ?? res.status}).`);
        setBusy(false);
        return;
      }
      setSaved(true);
      setBusy(false);
    } catch {
      setError('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <label className="flex flex-1 items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            setActive(e.target.checked);
            setSaved(false);
          }}
          className="h-4 w-4 accent-orange-600"
        />
        <span className="font-medium">{row.name}</span>
        <span className="text-xs text-neutral-500">(bazowo {row.base_price} zł)</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="0.01"
          value={override}
          onChange={(e) => {
            setOverride(e.target.value);
            setSaved(false);
          }}
          placeholder="cena własna"
          aria-label={`Cena na tym osiedlu dla ${row.name}`}
          className="w-32 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
        >
          {saved ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : null}
          {busy ? 'Zapisuję…' : saved ? 'Zapisano' : 'Zapisz'}
        </button>
      </div>
      {error && (
        <span className="w-full text-right text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}

export default function EstateActivations({ estateId, rows }: { estateId: string; rows: Row[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Zaznacz moduły dostępne na tym osiedlu. Puste pole ceny = cena bazowa modułu.
      </p>
      {rows.map((r) => (
        <RowItem key={r.module_id} estateId={estateId} row={r} />
      ))}
    </div>
  );
}
