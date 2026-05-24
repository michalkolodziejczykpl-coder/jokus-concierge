// A single service module tile on the resident home grid.
//
// Maps the `icon_name` string from the database to a lucide-react component
// via a static lookup. New modules added in SQL must also be added here —
// unknown icons fall back to a neutral box so a typo never crashes the page.

import Link from 'next/link';
import {
  Car,
  Dog,
  Hammer,
  Key,
  Mail,
  Package,
  PawPrint,
  Pill,
  Plane,
  Refrigerator,
  Luggage,
  Scan,
  ShoppingCart,
  Sprout,
  Stethoscope,
  Users,
  Wine,
  Wrench,
  Zap,
  Square,
  type LucideIcon
} from 'lucide-react';
import { formatPLN } from '@/lib/utils/formatters';
import type { Module, PriceUnit } from '@/lib/types/modules';

/**
 * Static icon registry. Keys match `modules.icon_name` values from
 * `20260516000001_initial_schema.sql:700+`. Keep in sync when adding modules.
 */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  Package,
  Mail,
  ShoppingCart,
  Pill,
  Wine,
  Scan,
  Car,
  Plane,
  Stethoscope,
  Dog,
  PawPrint,
  Sprout,
  // DB value 'Suitcase' is aliased to the lucide-react `Luggage` icon
  // (lucide dropped `Suitcase` before 0.400). Keep DB string stable so future
  // codegens don't churn — alias here.
  Suitcase: Luggage,
  Users,
  Wrench,
  Zap,
  Key,
  Hammer,
  Refrigerator
};

/** Suffix appended to the formatted price, e.g. "/h" for hourly modules. */
const PRICE_SUFFIX: Record<PriceUnit, string> = {
  fixed: '',
  hourly: '/h',
  per_km: '/km',
  percent: ''
};

function formatPrice(module: Module): string {
  if (module.price_unit === 'percent') {
    // base_price stored as e.g. 5.00 = "5%"
    return `${module.base_price.toString().replace('.', ',')}%`;
  }
  return `${formatPLN(module.base_price)}${PRICE_SUFFIX[module.price_unit]}`;
}

export function ModuleTile({ module }: { module: Module }) {
  // Ternary, not `&&`: `""` && X returns `""`, and `"" ?? fallback` keeps it,
  // which then breaks JSX because the result is typed as `"" | LucideIcon`.
  const Icon: LucideIcon = module.icon_name ? (ICON_BY_NAME[module.icon_name] ?? Square) : Square;

  return (
    <Link
      href={`/modules/${module.slug}`}
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-orange-400/60"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition group-hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>

      <span className="text-sm font-medium leading-tight text-neutral-900 dark:text-neutral-100">
        {module.name}
      </span>

      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        od {formatPrice(module)}
      </span>
    </Link>
  );
}
