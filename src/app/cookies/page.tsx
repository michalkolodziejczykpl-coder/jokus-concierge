// Cookie policy — public page, no auth required.
// We use only strictly-necessary cookies (login session). No analytics, no marketing.

import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { COMPANY } from '@/lib/constants';

export const metadata = {
  title: 'Polityka cookies | JOKUS Concierge',
  description:
    'Jakie pliki cookies wykorzystuje serwis JOKUS Concierge i jak nimi zarządzać. Stosujemy wyłącznie cookies niezbędne do działania serwisu.'
};

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Strona główna
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Polityka cookies</h1>
        <p className="mt-2 text-sm text-neutral-500">Ostatnia aktualizacja: 30 maja 2026</p>

        <section className="mt-8 space-y-4 text-neutral-700 dark:text-neutral-300">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            1. Czym są pliki cookies
          </h2>
          <p>
            Pliki cookies to niewielkie pliki tekstowe zapisywane na Twoim urządzeniu podczas
            korzystania z serwisu. Umożliwiają m.in. utrzymanie sesji zalogowanego użytkownika.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            2. Jakie cookies stosujemy
          </h2>
          <p>
            Serwis JOKUS Concierge ({COMPANY.legalName}, NIP {COMPANY.nip}) stosuje{' '}
            <strong>wyłącznie pliki cookies niezbędne</strong> do prawidłowego działania serwisu:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Cookies sesji i uwierzytelnienia</strong> — utrzymują Twoje zalogowanie
              (Supabase Auth). Bez nich logowanie i korzystanie z panelu nie jest możliwe.
            </li>
            <li>
              <strong>Lokalne ustawienia</strong> — drobne preferencje zapisywane lokalnie w
              przeglądarce (np. potwierdzenie zapoznania się z tą informacją), niewysyłane na
              serwer.
            </li>
          </ul>
          <p>
            <strong>Nie stosujemy</strong> cookies analitycznych, reklamowych ani śledzących firm
            trzecich. Nie profilujemy użytkowników i nie udostępniamy danych z cookies w celach
            marketingowych.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            3. Podstawa prawna
          </h2>
          <p>
            Cookies niezbędne do świadczenia usługi żądanej przez użytkownika nie wymagają zgody
            (art. 173 ust. 3 Prawa telekomunikacyjnego). Korzystamy z nich w oparciu o nasz prawnie
            uzasadniony interes polegający na zapewnieniu działania serwisu.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            4. Zarządzanie cookies
          </h2>
          <p>
            Możesz w każdej chwili zmienić ustawienia plików cookies w swojej przeglądarce, w tym je
            usunąć lub zablokować. Ograniczenie cookies niezbędnych może jednak uniemożliwić
            logowanie i korzystanie z serwisu.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            5. Więcej informacji
          </h2>
          <p>
            Zasady przetwarzania danych osobowych opisuje{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Polityka prywatności
            </Link>
            , a ogólne zasady korzystania z serwisu —{' '}
            <Link href="/regulamin" className="text-brand hover:underline">
              Regulamin
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
