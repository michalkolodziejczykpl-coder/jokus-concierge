// Resident home — the radial "pizza" menu (5 sections) over the module
// catalog. Replaces the former tile grid + the sklep/marketplace banner rows
// (their entry points now live inside the slices). Owner decision 2026-07-22,
// prototype: jokus_pizza_menu.html.
//
// Auth behavior is UNCHANGED: anonymous visitors are redirected to /login,
// the phone-verification and jokusor-role gates stay as they were. A public
// (anonymous) variant of this page is a separate product decision — not
// bundled with the menu redesign.
//
// Section rows and price labels are built HERE from the modules table —
// prices are never hardcoded in the JSX (the two deliberate label-only
// exceptions are marked below).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPLN } from '@/lib/utils/formatters';
import { COMING_SOON_MODULE_SLUGS } from '@/lib/constants';
import PizzaMenu, { type PizzaSection, type PizzaService } from '@/components/resident/PizzaMenu';
import type { Module } from '@/lib/types/modules';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

type CatalogRow = Pick<
  Module,
  'slug' | 'name' | 'category' | 'icon_name' | 'base_price' | 'price_unit' | 'min_price'
> & { sort_order: number | null };

/** "od 25,00 zł", "od 40,00 zł/h", "5% koszyka, min 14,90 zł", 0 → "wycena". */
function priceLabel(m: CatalogRow): string {
  if (m.price_unit === 'percent') {
    const rate = m.base_price.toString().replace('.', ',');
    return m.min_price != null
      ? `${rate}% koszyka, min ${formatPLN(m.min_price)}`
      : `${rate}% koszyka`;
  }
  if (m.base_price === 0) {
    // Deliberate non-DB label: custom-task has base_price 0 by design — the
    // price is agreed per job, so the catalog cannot carry a number here.
    return 'wycena';
  }
  const suffix = m.price_unit === 'hourly' ? '/h' : m.price_unit === 'per_km' ? '/km' : '';
  return `od ${formatPLN(m.base_price)}${suffix}`;
}

function toService(m: CatalogRow): PizzaService {
  return {
    key: m.slug,
    icon: m.icon_name,
    label: m.name,
    priceLabel: priceLabel(m),
    // Grocery goes through the cart pipeline, not the generic module form.
    href: m.slug === 'zakupy-spozywcze' ? '/sklep' : `/modules/${m.slug}`
  };
}

function buildSections(catalog: CatalogRow[]): PizzaSection[] {
  const byCat = (...cats: string[]) =>
    catalog
      .filter(
        (m) =>
          cats.includes(m.category) &&
          !(COMING_SOON_MODULE_SLUGS as readonly string[]).includes(m.slug)
      )
      .map(toService);

  const foodDelivery = catalog.find((m) => m.slug === 'food-delivery');
  const marketplaceDelivery = catalog.find((m) => m.slug === 'marketplace-delivery');

  return [
    {
      id: 'ext',
      title: 'Paczki / przewóz',
      l1: 'Paczki',
      l2: 'przewóz',
      desc: 'Nadamy, odbierzemy, zawieziemy — Ty nie ruszasz się z domu.',
      colors: ['#ff7a3c', '#e8531a'],
      icon: 'Package',
      services: byCat('delivery', 'transport')
    },
    {
      id: 'shop',
      title: 'Zakupy spożywcze',
      l1: 'Zakupy',
      l2: 'spożywcze',
      desc: 'Zakupy z Twojej listy, dostawa jokusora pod same drzwi.',
      colors: ['#27a06a', '#15663f'],
      icon: 'ShoppingCart',
      services: byCat('shopping')
    },
    {
      id: 'resto',
      title: 'Restauracje',
      l1: 'Restauracje',
      l2: '',
      desc: 'Ciepłe posiłki z lokali w Twojej okolicy.',
      colors: ['#ef4056', '#b81f35'],
      icon: 'UtensilsCrossed',
      soon: true,
      soonNote:
        'Sekcja restauracyjna startuje wkrótce — kolejność uruchamiania wg osiedli pilotażu.',
      services: [
        // The real food-delivery module rendered as part of the placeholder:
        // greyed out, no link (COMING_SOON gate; see lib/constants.ts).
        ...(foodDelivery
          ? [
              {
                key: foodDelivery.slug,
                icon: foodDelivery.icon_name,
                label: foodDelivery.name,
                priceLabel: 'wkrótce',
                href: null
              }
            ]
          : []),
        {
          key: 'resto-pickup-placeholder',
          icon: 'Store',
          label: 'Odbiór Twojego zamówienia z lokalu',
          priceLabel: 'wkrótce',
          href: null
        }
      ]
    },
    {
      id: 'home',
      title: 'Dom i mieszkanie',
      l1: 'Dom',
      l2: 'i mieszkanie',
      desc: 'Sprzątanie, pies, fachowiec — osiedlowa pomoc na zawołanie.',
      colors: ['#6a4f86', '#3b2a4a'],
      icon: 'Home',
      services: byCat('home_pet', 'errands', 'professional')
    },
    {
      id: 'market',
      title: 'Kup / Sprzedaj',
      l1: 'Kup /',
      l2: 'Sprzedaj',
      desc: 'Sąsiedzki marketplace z dostawą przez jokusora.',
      colors: ['#3a7bf2', '#1e4fbf'],
      icon: 'Repeat',
      services: [
        {
          key: 'marketplace-new',
          icon: 'Tag',
          label: 'Wystaw przedmiot',
          // Deliberate non-DB label: listing an item is free; no table stores
          // that fact, so "0 zł" is product copy, not a hidden price constant.
          priceLabel: '0 zł',
          href: '/marketplace/new'
        },
        {
          key: 'marketplace-browse',
          icon: 'ShoppingBag',
          label: 'Kup od sąsiada z dostawą',
          priceLabel: marketplaceDelivery
            ? `dostawa od ${formatPLN(marketplaceDelivery.base_price)}`
            : 'przeglądaj',
          href: '/marketplace'
        }
      ]
    }
  ];
}

export default async function ResidentHomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, phone_verified')
    .eq('id', user.id)
    .maybeSingle();
  const row = profile as { role?: string; phone_verified?: boolean } | null;
  const role = row?.role;
  const isAdmin = role === 'admin';

  // Phone-verification gate: every signed-in user (incl. Google accounts, which
  // have no phone) must verify a number once before using the app. Admins are
  // exempt to avoid locking the operator out; the Przelewy24 test account is
  // exempt by being seeded with phone_verified=true (see task README).
  if (!isAdmin && row?.phone_verified !== true) {
    redirect('/rejestracja/uzupelnij');
  }

  // Role gate: send jokusors to their dashboard instead of the resident catalog
  if (role === 'jokusor') {
    redirect('/dashboard');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    (user.user_metadata?.name as string | undefined)?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    'mieszkańcu';

  // Catalog for the pizza sections (RLS: modules readable by all).
  const { data: catalogRows, error: catErr } = await supabase
    .from('modules')
    .select('slug, name, category, icon_name, base_price, price_unit, min_price, sort_order')
    .eq('is_global', true)
    .order('category')
    .order('sort_order');
  if (catErr) {
    console.error('[/home] modules fetch', catErr);
  }
  // marketplace-delivery (is_global=false) provides the delivery price label.
  const { data: mktRow } = await supabase
    .from('modules')
    .select('slug, name, category, icon_name, base_price, price_unit, min_price, sort_order')
    .eq('slug', 'marketplace-delivery')
    .maybeSingle();

  const catalog = [
    ...((catalogRows as unknown as CatalogRow[] | null) ?? []),
    ...(mktRow ? [mktRow as unknown as CatalogRow] : [])
  ];
  const sections = buildSections(catalog);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Cześć, {displayName}
        </h1>
        <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
          W czym możemy pomóc?
        </p>
      </header>

      {isAdmin && (
        <section className="mb-8">
          <Link
            href="/panel"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/30 dark:hover:border-orange-700"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-600 text-white">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Panel administratora
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Moduły, ceny, osiedla, gastro, zgłoszenia jokusorów.
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-orange-700 group-hover:underline dark:text-orange-400">
              Otwórz →
            </span>
          </Link>
        </section>
      )}

      <PizzaMenu sections={sections} />

      <section className="mt-10">
        <Link
          href="/zostan-jokusorem"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-700 dark:hover:bg-orange-950/30"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Zostań jokusorem
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Realizuj zlecenia sąsiadów i zarabiaj w elastycznych godzinach.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-orange-600 group-hover:underline dark:text-orange-400">
            Dowiedz się →
          </span>
        </Link>
      </section>

      <footer className="mt-16 flex items-center justify-between border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
        <Link
          href="/profile"
          className="font-medium text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-300"
        >
          Mój profil
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            Wyloguj się
          </button>
        </form>
      </footer>
    </main>
  );
}
