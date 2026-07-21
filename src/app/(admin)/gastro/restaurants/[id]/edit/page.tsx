// /gastro/restaurants/[id]/edit — admin edits a restaurant partner.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RestaurantForm from '@/components/admin/RestaurantForm';

type PageProps = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RestaurantRow = {
  id: string;
  name: string;
  nip: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  notes: string | null;
};

export default async function EditRestaurantPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) redirect('/gastro/restaurants');

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

  const { data: row } = await supabase
    .from('restaurants')
    .select('id, name, nip, address, contact_email, contact_phone, is_active, notes')
    .eq('id', id)
    .maybeSingle();
  const restaurant = row as RestaurantRow | null;
  if (!restaurant) redirect('/gastro/restaurants');

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/gastro/restaurants"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Restauracje
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Edytuj restaurację
      </h1>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <RestaurantForm
          initial={{
            id: restaurant.id,
            name: restaurant.name,
            nip: restaurant.nip ?? '',
            address: restaurant.address ?? '',
            contact_email: restaurant.contact_email ?? '',
            contact_phone: restaurant.contact_phone ?? '',
            is_active: restaurant.is_active,
            notes: restaurant.notes ?? ''
          }}
        />
      </section>
    </main>
  );
}
