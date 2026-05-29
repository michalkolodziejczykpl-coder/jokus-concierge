// Privacy policy — public page, no auth required.
// This is a minimal RODO-compliant skeleton. Replace with lawyer-reviewed text before public launch.

import Link from 'next/link';
import Footer from '@/components/shared/Footer';

export const metadata = {
  title: 'Polityka prywatności | MIGMIG Concierge',
  description:
    'Polityka prywatności serwisu MIGMIG Concierge — administrator danych, cel przetwarzania, prawa użytkownika.'
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Strona główna
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Polityka prywatności</h1>
        <p className="mt-2 text-sm text-neutral-500">Ostatnia aktualizacja: 18 maja 2026</p>

        <section className="mt-8 space-y-4 text-neutral-700 dark:text-neutral-300">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            1. Administrator danych
          </h2>
          <p>
            Administratorem Twoich danych osobowych jest <strong>JOKUS Sp. z o.o.</strong> z
            siedzibą we Wrocławiu, NIP 9131639730 (dalej: „MIGMIG"). Kontakt:{' '}
            <a
              className="text-brand hover:underline"
              href="mailto:michal.kolodziejczyk.pl@gmail.com"
            >
              michal.kolodziejczyk.pl@gmail.com
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            2. Jakie dane zbieramy
          </h2>
          <p>W zależności od sposobu korzystania z serwisu możemy zbierać:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Adres e-mail, imię i zdjęcie profilowe (z dostawcy OAuth: Google, Facebook, Apple).
            </li>
            <li>Adres dostawy zleceń (gdy go podasz).</li>
            <li>Treść zleceń (np. lista zakupów) i czasy realizacji.</li>
            <li>Logi techniczne (IP, przeglądarka) na potrzeby bezpieczeństwa.</li>
          </ul>
          <p>
            <strong>Nie przechowujemy</strong> ciągłych pozycji GPS jokusora — lokalizacja jest
            transmitowana w czasie rzeczywistym wyłącznie do zalogowanego mieszkańca śledzącego dane
            zlecenie i nie zostaje zapisana.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            3. Cel i podstawa prawna
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Realizacja zleceń (art. 6 ust. 1 lit. b RODO — wykonanie umowy).</li>
            <li>Obsługa płatności (art. 6 ust. 1 lit. b RODO).</li>
            <li>
              Bezpieczeństwo i wykrywanie nadużyć (art. 6 ust. 1 lit. f RODO — prawnie uzasadniony
              interes).
            </li>
            <li>Spełnienie obowiązków podatkowych i księgowych (art. 6 ust. 1 lit. c RODO).</li>
          </ul>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            4. Komu udostępniamy dane
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Jokusorzy realizujący Twoje zlecenia (w zakresie potrzebnym do wykonania usługi).
            </li>
            <li>Dostawca infrastruktury chmurowej — Supabase (region: Sztokholm, UE).</li>
            <li>Dostawca hostingu — Vercel.</li>
            <li>Operator płatności — Przelewy24.</li>
            <li>
              Dostawcy OAuth (Google, Facebook, Apple) — wyłącznie w zakresie uwierzytelnienia.
            </li>
            <li>Organy publiczne — wyłącznie gdy wymaga tego prawo.</li>
          </ul>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            5. Okres przechowywania
          </h2>
          <p>
            Dane konta przechowujemy przez czas posiadania konta oraz do 5 lat po jego usunięciu —
            wyłącznie w zakresie wymaganym przez prawo (księgowość, podatki, ewentualne roszczenia).
            Treści zleceń anonimizujemy po 24 miesiącach.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            6. Twoje prawa
          </h2>
          <p>Masz prawo do:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Dostępu do swoich danych i otrzymania ich kopii.</li>
            <li>Sprostowania, ograniczenia przetwarzania lub usunięcia.</li>
            <li>Przeniesienia danych do innego dostawcy.</li>
            <li>Sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie.</li>
            <li>Skargi do Prezesa UODO (uodo.gov.pl).</li>
          </ul>
          <p>
            Aby skorzystać z któregokolwiek prawa, napisz do nas na adres podany w punkcie 1, lub
            skorzystaj z{' '}
            <Link href="/data-deletion" className="text-brand hover:underline">
              instrukcji usunięcia konta
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            7. Pliki cookies
          </h2>
          <p>
            Używamy wyłącznie cookies niezbędnych do działania serwisu (sesja logowania). Nie
            stosujemy cookies marketingowych ani analitycznych firm trzecich. Szczegóły w{' '}
            <Link href="/cookies" className="text-brand hover:underline">
              Polityce cookies
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            8. Zmiany polityki
          </h2>
          <p>
            O istotnych zmianach poinformujemy Cię e-mailem z wyprzedzeniem co najmniej 14 dni.
            Aktualna wersja zawsze dostępna jest pod tym adresem.
          </p>

          <p className="mt-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>Uwaga:</strong> Serwis jest obecnie w fazie testów. Powyższy dokument stanowi
            podstawową informację — finalna wersja zostanie zweryfikowana przez prawnika przed
            publicznym uruchomieniem.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
