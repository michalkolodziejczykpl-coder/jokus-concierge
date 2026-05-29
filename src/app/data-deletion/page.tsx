// Data deletion instructions — public page, no auth required.
// Required by Facebook Login policy and RODO art. 17 (right to be forgotten).

import Link from 'next/link';
import Footer from '@/components/shared/Footer';

export const metadata = {
  title: 'Usunięcie danych | JOKUS Concierge',
  description: 'Jak usunąć konto i wszystkie dane osobowe z serwisu JOKUS Concierge.'
};

export default function DataDeletionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Strona główna
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Usunięcie konta i danych</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Zgodnie z art. 17 RODO masz prawo żądać usunięcia swoich danych osobowych w dowolnym
          momencie.
        </p>

        <section className="mt-8 space-y-4 text-neutral-700 dark:text-neutral-300">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Sposób 1 — z poziomu aplikacji (zalecane)
          </h2>
          <p>
            Po zalogowaniu się przejdź do <strong>Profil → Ustawienia → Usuń konto</strong>. Konto
            zostanie usunięte natychmiast wraz ze wszystkimi danymi osobowymi.
          </p>
          <p className="text-sm text-neutral-500">
            (Ten przepływ jest w trakcie wdrażania. Do czasu jego uruchomienia prosimy korzystać ze
            Sposobu 2.)
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Sposób 2 — e-mail
          </h2>
          <p>Wyślij wiadomość na adres:</p>
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-900">
            michal.kolodziejczyk.pl@gmail.com
          </p>
          <p>
            z tytułem <em>„Usunięcie konta JOKUS"</em> i z adresu e-mail, którego użyłeś do
            rejestracji. Konto usuniemy w ciągu 30 dni od otrzymania zgłoszenia (zwykle szybciej).
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Co zostanie usunięte
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Dane logowania (e-mail, identyfikatory OAuth).</li>
            <li>Imię, nazwisko, zdjęcie profilowe.</li>
            <li>Adresy dostawy.</li>
            <li>Historia zleceń i wiadomości w marketplace.</li>
            <li>Recenzje, które wystawiłeś.</li>
          </ul>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Co możemy zachować
          </h2>
          <p>
            Zgodnie z polskim prawem (Ordynacja podatkowa, Ustawa o rachunkowości) możemy być
            zobowiązani zachować przez 5 lat:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Faktury i dokumenty księgowe związane z opłaconymi zleceniami.</li>
            <li>Zanonimizowane logi systemowe (bez powiązania z osobą).</li>
          </ul>
          <p>
            Te dane przechowujemy wyłącznie w celu wypełnienia obowiązku prawnego — nie używamy ich
            do żadnych innych celów.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Pytania</h2>
          <p>
            Wszystkie pytania związane z ochroną danych kieruj na adres administratora podany w{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Polityce prywatności
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
