'use client';

// Delete a mis-logged gastro course (corrections = delete + re-add, so the
// frozen fee is always recomputed consistently). Confirms before deleting.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function GastroCourseDeleteButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    if (!window.confirm('Usunąć ten kurs? Poprawki robimy przez usunięcie i ponowne dodanie.')) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gastro/courses/${courseId}`, { method: 'DELETE' });
      if (!res.ok) {
        window.alert(`Nie udało się usunąć (${res.status}).`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      window.alert('Błąd sieci.');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      aria-label="Usuń kurs"
      className="rounded-lg border border-neutral-300 p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
