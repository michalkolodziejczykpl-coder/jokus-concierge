// /estates (admin) — list + manage estates.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DeleteButton from '@/components/admin/DeleteButton';

type Row = {
  id: string;
  name: string;
  city: string;
  postal_codes: string[] | null;
  is_active: boolean;
};

export default async function AdminEstatesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/home');

  const { data: rows, error } = await supabase
    .from('estates')
    .select('id, name, city, postal_codes, is_active')
    .order('name', { ascending: true });
  if (error) {
    console.error('[/admin/estates] fetch', error);
    throw new Error('Nie udało się załadować osiedli');
  }
  const estates = (rows as Row[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Panel
      </Link>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Osiedla
        </h1>
        <Link
          href="/estates/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nowe osiedle
        </Link>
      </header>

      <section className="mt-8 space-y-3">
        {estates.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Brak osiedli. Dodaj pierwsze.
          </div>
        ) : (
          estates.map((e) => (
            <article
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {e.name}
                  {!e.is_active && (
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      nieaktywne
                    </span>
                  )}
                </h2>
                <p className="text-sm text-neutral-500">
                  {e.city} · {e.postal_codes?.length ?? 0} kod(ów) pocztowych
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/estates/${e.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edytuj
                </Link>
                <DeleteButton
                  url={`/api/admin/estates/${e.id}`}
                  confirmText={`Usunąć osiedle „${e.name}"?`}
                  inUseMessage="Nie można usunąć — osiedle ma powiązanych mieszkańców/jokusorów. Odznacz „aktywne” zamiast usuwać."
                />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
