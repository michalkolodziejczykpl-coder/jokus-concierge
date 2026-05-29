// Public site footer — company identity + legal links.
// Rendered on public/unauthenticated pages (landing, legal pages). P24 verification
// requires the operator's data and a Regulamin link to be reachable from the site.

import Link from 'next/link';
import { COMPANY } from '@/lib/constants';

const LEGAL_LINKS = [
  { href: '/regulamin', label: 'Regulamin' },
  { href: '/privacy', label: 'Polityka prywatności' },
  { href: '/cookies', label: 'Pliki cookies' },
  { href: '/data-deletion', label: 'Usunięcie danych' }
] as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8 text-sm text-neutral-600 dark:text-neutral-400 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">
            {COMPANY.brandName}
          </p>
          <p>
            {COMPANY.legalName} · {COMPANY.city}
          </p>
          <p>NIP {COMPANY.nip}</p>
          <p>
            <a className="hover:underline" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
          </p>
        </div>

        <nav aria-label="Informacje prawne" className="flex flex-col gap-1.5 sm:text-right">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-8 text-xs text-neutral-400 dark:text-neutral-600">
        © {year} {COMPANY.legalName}. Wszelkie prawa zastrzeżone.
      </div>
    </footer>
  );
}
