import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import EstateForm from '@/components/admin/EstateForm';
import EstateActivations from '@/components/admin/EstateActivations';

type PageProps = { params: Promise<{ id: string }> };

type EstateRow = {
  id: string;
  name: string;
  city: string;
  voivodeship: string | null;
  postal_codes: string[] | null;
  is_active: boolean;
};
type ModuleRow = { id: string; name: string; base_price: number };
type ActRow = { module_id: string; active: boolean; price_override: number | null };

export default async function EditEstatePage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: estateRow } = await supabase
    .from('estates')
    .select('id, name, city, voivodeship, postal_codes, is_active')
    .eq('id', id)
    .maybeSingle();
  if (!estateRow) notFound();
  const estate = estateRow as EstateRow;

  const [{ data: modRows }, { data: actRows }] = await Promise.all([
    supabase
      .from('modules')
      .select('id, name, base_price')
      .order('sort_order', { ascending: true })
      .order('name'),
    supabase
      .from('module_activations')
      .select('module_id, active, price_override')
      .eq('estate_id', id)
  ]);

  const modules = (modRows as unknown as ModuleRow[] | null) ?? [];
  const acts = (actRows as unknown as ActRow[] | null) ?? [];
  const actMap = new Map(acts.map((a) => [a.module_id, a]));
  const rows = modules.map((m) => {
    const a = actMap.get(m.id);
    return {
      module_id: m.id,
      name: m.name,
      base_price: m.base_price,
      active: a?.active ?? false,
      price_override: a?.price_override ?? null
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/estates"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Osiedla
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Edytuj osiedle
      </h1>

      <div className="mt-8">
        <EstateForm
          initial={{
            id: estate.id,
            name: estate.name,
            city: estate.city,
            voivodeship: estate.voivodeship ?? '',
            postal_codes: (estate.postal_codes ?? []).join(', '),
            is_active: estate.is_active
          }}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Moduły na tym osiedlu
        </h2>
        <div className="mt-3">
          <EstateActivations estateId={estate.id} rows={rows} />
        </div>
      </section>
    </main>
  );
}
