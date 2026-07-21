// /gastro/restaurants — admin: restaurant partners list + add form.
// Admin-gated like the other (admin) pages.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RestaurantForm from '@/components/admin/RestaurantForm';

type RestaurantRow = {
  id: string;
  name: string;
  nip: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
};

export default async function RestaurantsPage() {
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
    .from('restaurants')
    .select('id, name, nip, address, contact_email, contact_phone, is_active')
    .order('name');
  if (error) {
    console.error('[/gastro/restaurants] fetch', error);
    throw new Error('Nie udało się załadować restauracji');
  }
  const restaurants = (rows as RestaurantRow[] | null) ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/gastro"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Gastro
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Restauracje
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Partnerzy gastro — płatnicy kursów (faktura zbiorcza raz w tygodniu).
      </p>

      <section className="mt-6">
        {restaurants.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Nie ma jeszcze żadnej restauracji — dodaj pierwszą poniżej.
          </div>
        ) : (
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {r.name}
                    {!r.is_active && (
                      <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        nieaktywna
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {[r.nip && `NIP ${r.nip}`, r.address, r.contact_phone, r.contact_email]
                      .filter(Boolean)
                      .join(' · ') || 'brak danych kontaktowych'}
                  </p>
                </div>
                <Link
                  href={`/gastro/restaurants/${r.id}/edit`}
                  aria-label={`Edytuj: ${r.name}`}
                  className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Dodaj restaurację
        </h2>
        <div className="mt-4">
          <RestaurantForm
            initial={{
              name: '',
              nip: '',
              address: '',
              contact_email: '',
              contact_phone: '',
              is_active: true,
              notes: ''
            }}
          />
        </div>
      </section>
    </main>
  );
}
