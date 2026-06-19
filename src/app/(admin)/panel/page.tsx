// /panel — admin hub. Admin-gated. Tiles to the management sections.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, Boxes, MapPin, ClipboardCheck, ShoppingCart, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const TILES = [
  {
    href: '/modules',
    title: 'Moduły usług',
    desc: 'Dodawaj, edytuj i wyceniaj usługi.',
    Icon: Boxes
  },
  {
    href: '/products',
    title: 'Produkty (sklep)',
    desc: 'Katalog spożywczy: produkty i kategorie.',
    Icon: ShoppingCart
  },
  { href: '/estates', title: 'Osiedla', desc: 'Zarządzaj osiedlami i ich modułami.', Icon: MapPin },
  {
    href: '/jokusors',
    title: 'Zgłoszenia jokusorów',
    desc: 'Weryfikuj i akceptuj kandydatów.',
    Icon: ClipboardCheck
  },
  {
    href: '/users',
    title: 'Użytkownicy',
    desc: 'Wszyscy użytkownicy i obszary jokusorów.',
    Icon: Users
  }
] as const;

export default async function AdminPanelPage() {
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

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        Panel administratora
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Zarządzaj tym, jak działa aplikacja.
      </p>

      <nav className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TILES.map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-700"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold text-neutral-900 group-hover:text-orange-700 dark:text-neutral-50 dark:group-hover:text-orange-400">
                {title}
              </span>
              <span className="mt-0.5 block text-sm text-neutral-600 dark:text-neutral-400">
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
