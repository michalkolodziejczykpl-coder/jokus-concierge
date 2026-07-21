// /onboarding/address — first-time setup for a logged-in resident.
//
// Reached either:
// - automatically (redirect from /modules/[moduleKey] when no default address yet),
//   in which case `?next=` carries the original destination
// - directly by the user (no `?next` → back to /home after submit)
//
// If the user already has a default address, bounce them straight to `next`
// so this page never blocks them.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDefaultAddress } from '@/lib/auth/getDefaultAddress';
import { AddressOnboardingForm } from '@/components/resident/AddressOnboardingForm';

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function OnboardingAddressPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const next = sanitizeNext(params.next);

  const existing = await getDefaultAddress();
  if (existing) {
    redirect(next);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Krok 1 z 1</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Dokąd przyjeżdżamy?
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          Potrzebujemy Twojego adresu, żeby przypisać Cię do jokusora z Twojej okolicy. Zmienisz to
          w każdej chwili w profilu.
        </p>
      </header>

      <AddressOnboardingForm next={next} />
    </main>
  );
}

/**
 * Only allow relative same-origin paths as redirect targets, never absolute
 * URLs. Prevents open-redirect class of bugs if `?next=` is ever crafted by
 * an attacker.
 */
function sanitizeNext(raw: string | undefined): string {
  if (!raw) return '/home';
  if (!raw.startsWith('/')) return '/home';
  if (raw.startsWith('//')) return '/home';
  return raw;
}
