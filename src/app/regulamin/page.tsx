// Regulamin (Terms of Service) — public page, no auth required.
// Full Polish draft tailored to JOKUS. Required by Przelewy24 verification and by
// Polish law (ustawa o świadczeniu usług drogą elektroniczną, art. 8).
// MUST be reviewed by a lawyer before public launch — see the notice at the bottom.

import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { COMPANY, SLOT_HOLD_TTL_SECONDS } from '@/lib/constants';

export const metadata = {
  title: 'Regulamin | JOKUS Concierge',
  description:
    'Regulamin świadczenia usług drogą elektroniczną w serwisie JOKUS Concierge — zasady zamawiania, płatności, reklamacji i odstąpienia od umowy.'
};

export default function RegulaminPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Strona główna
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Regulamin serwisu JOKUS Concierge
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Wersja 1.0 · obowiązuje od 30 maja 2026 r.</p>

        <section className="mt-8 space-y-4 text-neutral-700 dark:text-neutral-300">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 1. Postanowienia ogólne
          </h2>
          <p>
            Niniejszy Regulamin określa zasady korzystania z serwisu internetowego i aplikacji
            JOKUS Concierge (dalej: „Serwis"), dostępnego pod adresem{' '}
            <a className="text-brand hover:underline" href="https://www.migmig.pl">
              www.migmig.pl
            </a>
            , oraz zasady świadczenia usług drogą elektroniczną zgodnie z ustawą z dnia 18 lipca
            2002 r. o świadczeniu usług drogą elektroniczną.
          </p>
          <p>
            Operatorem Serwisu jest <strong>{COMPANY.legalName}</strong> z siedzibą w mieście{' '}
            {COMPANY.city}, NIP {COMPANY.nip} (dalej: „Operator" lub „JOKUS"). Kontakt z
            Operatorem:{' '}
            <a className="text-brand hover:underline" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
            .
          </p>
          <p>
            Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu. Regulamin jest
            udostępniany nieodpłatnie w sposób umożliwiający jego pozyskanie, odtwarzanie i
            utrwalanie.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 2. Definicje
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Mieszkaniec</strong> — użytkownik zamawiający usługi za pośrednictwem Serwisu.
            </li>
            <li>
              <strong>Jokusor</strong> — osoba lub podmiot realizujący zlecone usługi w ramach
              modelu franczyzowego JOKUS.
            </li>
            <li>
              <strong>Usługa</strong> — usługa osiedlowa zamawiana przez Mieszkańca (m.in. zakupy,
              dostawa paczek, wyprowadzanie psa, nadzór nad fachowcem).
            </li>
            <li>
              <strong>Marketplace</strong> — funkcja Serwisu umożliwiająca Mieszkańcom sprzedaż i
              kupno przedmiotów między sobą, z opcjonalną dostawą realizowaną przez Jokusora.
            </li>
            <li>
              <strong>Zlecenie</strong> — zamówienie złożone przez Mieszkańca na realizację Usługi w
              wybranym terminie (slocie czasowym).
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 3. Wymagania techniczne
          </h2>
          <p>
            Do korzystania z Serwisu niezbędne jest urządzenie z dostępem do Internetu, aktualna
            przeglądarka internetowa z włączoną obsługą JavaScript i plików cookies oraz aktywne
            konto poczty elektronicznej. Logowanie odbywa się za pośrednictwem dostawcy zewnętrznego
            (Google), zgodnie z{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Polityką prywatności
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 4. Rejestracja i konto
          </h2>
          <p>
            Założenie konta następuje poprzez uwierzytelnienie zewnętrznym dostawcą tożsamości.
            Mieszkaniec zobowiązuje się podawać dane prawdziwe i aktualne oraz nie udostępniać konta
            osobom trzecim. Konto można w każdej chwili usunąć zgodnie z{' '}
            <Link href="/data-deletion" className="text-brand hover:underline">
              instrukcją usunięcia danych
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 5. Składanie i realizacja zleceń
          </h2>
          <p>
            Mieszkaniec składa Zlecenie wybierając rodzaj Usługi, podając niezbędne szczegóły (np.
            adres, listę zakupów) oraz wybierając dostępny termin realizacji. Terminy (sloty) nie
            nakładają się na siebie — w danym przedziale czasu Jokusor realizuje jedno Zlecenie.
          </p>
          <p>
            Po wyborze terminu slot zostaje czasowo zarezerwowany na {SLOT_HOLD_TTL_SECONDS} sekund
            w celu dokonania płatności. Umowa o świadczenie Usługi zostaje zawarta w chwili
            potwierdzenia płatności. Następnie Zlecenie przekazywane jest Jokusorowi do akceptacji i
            realizacji. Mieszkaniec jest informowany o statusie Zlecenia w Serwisie.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 6. Ceny i płatności
          </h2>
          <p>
            Ceny Usług prezentowane w Serwisie są cenami brutto wyrażonymi w złotych polskich (PLN)
            i zawierają wszystkie podatki. Całkowita kwota do zapłaty, obejmująca cenę Usługi oraz
            ewentualne koszty dostawy, prezentowana jest Mieszkańcowi przed potwierdzeniem
            płatności.
          </p>
          <p>
            Płatności obsługiwane są przez operatora płatności{' '}
            <strong>{COMPANY.paymentProvider}</strong>, m.in. metodą BLIK. Operator płatności
            przetwarza dane transakcji zgodnie z własnym regulaminem. JOKUS nie przechowuje danych
            kart płatniczych.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 7. Marketplace i rozliczenia depozytowe (escrow)
          </h2>
          <p>
            W ramach Marketplace Mieszkańcy mogą oferować przedmioty do sprzedaży innym Mieszkańcom.
            Przy zakupie z dostawą środki kupującego są blokowane (escrow) przez Operatora i
            przekazywane sprzedającemu po upływie {COMPANY.inspectionWindowMinutes}-minutowego
            okresu na sprawdzenie przedmiotu po dostawie. Operator pobiera prowizję w wysokości{' '}
            {COMPANY.marketplaceCommissionPct}% wartości transakcji Marketplace.
          </p>
          <p>
            Operator nie jest stroną umowy sprzedaży zawieranej między Mieszkańcami i nie odpowiada
            za jakość, legalność ani zgodność z opisem przedmiotów wystawianych w Marketplace, z
            zastrzeżeniem obowiązków wynikających z bezwzględnie obowiązujących przepisów prawa.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 8. Prawo odstąpienia od umowy (konsumenci)
          </h2>
          <p>
            Mieszkańcowi będącemu konsumentem przysługuje co do zasady prawo odstąpienia od umowy
            zawartej na odległość w terminie 14 dni bez podania przyczyny. Prawo to{' '}
            <strong>nie przysługuje</strong> w odniesieniu do usług, jeżeli Operator wykonał w pełni
            usługę za wyraźną zgodą konsumenta, który został poinformowany przed rozpoczęciem
            świadczenia, że po jego spełnieniu utraci prawo odstąpienia (art. 38 pkt 1 ustawy o
            prawach konsumenta).
          </p>
          <p>
            Składając Zlecenie z terminem realizacji wcześniejszym niż upływ 14 dni, Mieszkaniec
            żąda rozpoczęcia świadczenia Usługi przed upływem terminu na odstąpienie i przyjmuje do
            wiadomości utratę tego prawa po pełnym wykonaniu Usługi. Odstąpienie należy zgłosić na
            adres e-mail Operatora.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 9. Reklamacje
          </h2>
          <p>
            Reklamacje dotyczące Usług oraz działania Serwisu można składać na adres{' '}
            <a className="text-brand hover:underline" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
            . Reklamacja powinna zawierać dane Mieszkańca, opis problemu oraz numer Zlecenia.
            Operator rozpatruje reklamacje w terminie 14 dni od ich otrzymania i informuje o wyniku
            drogą elektroniczną.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 10. Zasady korzystania
          </h2>
          <p>
            Zakazane jest dostarczanie przez Mieszkańca treści o charakterze bezprawnym, składanie
            fałszywych Zleceń oraz korzystanie z Serwisu w sposób zakłócający jego działanie.
            Operator może zablokować konto naruszające Regulamin lub przepisy prawa.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 11. Dane osobowe i cookies
          </h2>
          <p>
            Zasady przetwarzania danych osobowych opisuje{' '}
            <Link href="/privacy" className="text-brand hover:underline">
              Polityka prywatności
            </Link>
            , a zasady stosowania plików cookies —{' '}
            <Link href="/cookies" className="text-brand hover:underline">
              Polityka cookies
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 12. Pozasądowe rozwiązywanie sporów
          </h2>
          <p>
            Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia
            roszczeń, m.in. zwracając się do właściwego rzecznika konsumentów lub korzystając z
            unijnej platformy ODR (ec.europa.eu/consumers/odr). Skorzystanie z tych metod jest
            dobrowolne.
          </p>

          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            § 13. Postanowienia końcowe
          </h2>
          <p>
            Operator może zmienić Regulamin z ważnych przyczyn (zmiana przepisów prawa, zakresu
            usług, względy bezpieczeństwa), informując o tym z wyprzedzeniem co najmniej 14 dni. W
            sprawach nieuregulowanych stosuje się przepisy prawa polskiego. Aktualna wersja
            Regulaminu jest zawsze dostępna pod tym adresem.
          </p>

          <p className="mt-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>Uwaga:</strong> Serwis jest obecnie w fazie testów. Powyższy dokument stanowi
            roboczy projekt regulaminu przygotowany na potrzeby weryfikacji i musi zostać
            zweryfikowany przez prawnika przed publicznym uruchomieniem oraz uzupełniony o pełne
            dane rejestrowe Operatora (adres, KRS, REGON, kapitał zakładowy).
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
