// /profile — edit own data. One route for everyone; branches by role so we
// avoid a route collision between the (resident) and (jokusor) groups.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ChangePassword from '@/components/shared/ChangePassword';
import ResidentProfileForm from './ResidentProfileForm';
import JokusorProfileForm from './JokusorProfileForm';

type Estate = { id: string; name: string };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Password management is for email/password accounts only. OAuth-only users
  // (Google/Facebook) have no Supabase password to change.
  const hasEmailIdentity = user.identities?.some((i) => i.provider === 'email') ?? false;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, phone, role')
    .eq('id', user.id)
    .maybeSingle();
  const p = profile as { full_name: string | null; phone: string | null; role: string } | null;
  const role = p?.role ?? 'resident';
  const backHref = role === 'jokusor' ? '/dashboard' : '/home';

  let inner: React.ReactNode;

  if (role === 'jokusor') {
    const { data: jokRow } = await supabase
      .from('jokusors')
      .select('bio, service_postal_codes, business_name, nip, bank_account, public_photo_url')
      .eq('user_id', user.id)
      .maybeSingle();
    const j = jokRow as {
      bio: string | null;
      service_postal_codes: string[] | null;
      business_name: string | null;
      nip: string | null;
      bank_account: string | null;
      public_photo_url: string | null;
    } | null;

    inner = (
      <JokusorProfileForm
        userId={user.id}
        initial={{
          full_name: p?.full_name ?? '',
          phone: p?.phone ?? '',
          bio: j?.bio ?? '',
          service_postal_codes: (j?.service_postal_codes ?? []).join(', '),
          business_name: j?.business_name ?? '',
          nip: j?.nip ?? '',
          bank_account: j?.bank_account ?? '',
          public_photo_url: j?.public_photo_url ?? ''
        }}
      />
    );
  } else {
    const [{ data: addr }, { data: estates }] = await Promise.all([
      supabase
        .from('addresses')
        .select('estate_id, street, building, apartment, city, postal_code')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle(),
      supabase.from('estates').select('id, name').order('name')
    ]);
    const a = addr as {
      estate_id: string;
      street: string;
      building: string;
      apartment: string | null;
      city: string;
      postal_code: string;
    } | null;

    inner = (
      <ResidentProfileForm
        estates={(estates as Estate[] | null) ?? []}
        initial={{
          full_name: p?.full_name ?? '',
          phone: p?.phone ?? '',
          estate_id: a?.estate_id ?? '',
          street: a?.street ?? '',
          building: a?.building ?? '',
          apartment: a?.apartment ?? '',
          city: a?.city ?? 'Wrocław',
          postal_code: a?.postal_code ?? ''
        }}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Wróć
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Mój profil
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Zaktualizuj swoje dane — zmiany zapiszą się od razu.
      </p>

      <div className="mt-8">{inner}</div>

      <div className="mt-8">
        {hasEmailIdentity ? (
          <ChangePassword />
        ) : (
          <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Logujesz się przez Google — hasłem zarządzasz w swoim koncie Google.
          </p>
        )}
      </div>
    </main>
  );
}
