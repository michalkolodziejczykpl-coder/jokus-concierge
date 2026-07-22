// /panel — admin hub. Admin-gated. Tiles to the management sections.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ChevronLeft,
  Boxes,
  MapPin,
  ClipboardCheck,
  MessageSquareWarning,
  ShoppingCart,
  Users,
  UtensilsCrossed
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { dayKey } from '@/lib/utils/formatters';

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
    href: '/gastro',
    title: 'Gastro — restauracje',
    desc: 'Kursy dostaw i tygodniowe zestawienia.',
    Icon: UtensilsCrossed
  },
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

  // SMS usage counter (sms_send_log, RLS: admin read). The daily LIMIT lives
  // only in the edge-function secret SMS_DAILY_GLOBAL_LIMIT, so the panel
  // shows usage + rejections, not "remaining". Defensive: in an environment
  // without migration 20260722000001 the query errors — show nothing instead
  // of crashing.
  const today = dayKey(new Date().toISOString());
  const monthFirst = `${today.slice(0, 7)}-01`;
  const [sentTodayRes, sentMonthRes, rejectedTodayRes] = await Promise.all([
    supabase
      .from('sms_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .eq('sent_on', today),
    supabase
      .from('sms_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_on', monthFirst),
    supabase
      .from('sms_send_log')
      .select('id', { count: 'exact', head: true })
      .in('status', ['rejected_global_budget', 'rejected_phone_limit'])
      .eq('sent_on', today)
  ]);
  const smsLogAvailable = !sentTodayRes.error;
  const smsSentToday = sentTodayRes.count ?? 0;
  const smsSentMonth = sentMonthRes.count ?? 0;
  const smsRejectedToday = rejectedTodayRes.count ?? 0;

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

      {smsLogAvailable && (
        <section
          className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
            smsRejectedToday > 0
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
              : 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
          }`}
        >
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">SMS (OTP):</span> dziś {smsSentToday} · w tym miesiącu{' '}
            {smsSentMonth}
            {smsRejectedToday > 0 && (
              <>
                {' '}
                · <span className="font-bold">ODRZUCONE budżetem dziś: {smsRejectedToday}</span> —
                wysyłka kodów jest blokowana; podnieś <code>SMS_DAILY_GLOBAL_LIMIT</code> w Supabase
                → Edge Functions → Secrets.
              </>
            )}
          </p>
        </section>
      )}

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
