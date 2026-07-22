'use client';

// Radial "pizza" home menu — 5 slices (72° each, 1.6° gap) around a white
// center hole with the JOKUS logo. Reproduces the geometry/colors/behavior of
// the owner's prototype (jokus_pizza_menu.html, concept B): click/Enter on a
// slice opens a fullscreen section sheet; the top-left triangle and Escape
// return to the wheel. Sheets carry a focus trap and aria roles; the
// prototype's emoji are replaced with lucide icons (same set the module
// tiles used).
//
// All service rows and price labels arrive via props, built server-side from
// the modules catalog (and fee_config where relevant) — no prices live in
// this JSX.

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Clock,
  Cpu,
  Dog,
  Flower2,
  Hammer,
  HeartHandshake,
  Home,
  Key,
  Luggage,
  Mail,
  Package,
  PackageCheck,
  PaintRoller,
  PawPrint,
  Pill,
  Plane,
  Refrigerator,
  Repeat,
  Scan,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shrub,
  Sofa,
  Sparkles,
  Sprout,
  Square,
  Stethoscope,
  Store,
  Tag,
  Trash2,
  Truck,
  Tv,
  UtensilsCrossed,
  Users,
  Wand2,
  Wind,
  Wine,
  Wrench,
  Zap,
  type LucideIcon
} from 'lucide-react';

/**
 * Icon registry keyed by `modules.icon_name` + the section icons. Superset of
 * the registry the old ModuleTile grid used — unknown names fall back to a
 * neutral square so a DB typo never crashes the home page.
 */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  Car,
  Clock,
  Cpu,
  Dog,
  Flower2,
  Hammer,
  HeartHandshake,
  Home,
  Key,
  Mail,
  Package,
  PackageCheck,
  PaintRoller,
  PawPrint,
  Pill,
  Plane,
  Refrigerator,
  Repeat,
  Scan,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shrub,
  Sofa,
  Sparkles,
  Sprout,
  Stethoscope,
  Store,
  // DB value 'Suitcase' aliases lucide `Luggage` (lucide dropped Suitcase).
  Suitcase: Luggage,
  Tag,
  Trash2,
  Truck,
  Tv,
  UtensilsCrossed,
  Users,
  Wand2,
  Wind,
  Wine,
  Wrench,
  Zap
};

const iconFor = (name: string | null): LucideIcon =>
  name ? (ICON_BY_NAME[name] ?? Square) : Square;

export type PizzaService = {
  key: string;
  /** lucide icon name (modules.icon_name); null → neutral square. */
  icon: string | null;
  label: string;
  /** Price label built server-side from the module row — never hardcoded here. */
  priceLabel: string;
  /** Navigation target; null for "coming soon" rows. */
  href: string | null;
};

export type PizzaSection = {
  id: string;
  title: string;
  /** Two label lines on the slice (l2 may be empty). */
  l1: string;
  l2: string;
  desc: string;
  /** Gradient [from, to]. */
  colors: [string, string];
  icon: string;
  services: PizzaService[];
  /** Whole section is a "coming soon" placeholder (Restauracje). */
  soon?: boolean;
  soonNote?: string;
};

// Prototype geometry: viewBox 500×500, outer R 238, hole R 72, labels at 163.
const CX = 250;
const CY = 250;
const R = 238;
const RIN = 72;
const LR = 163;
const GAP = 1.6;

function pt(angleDeg: number, r: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function wedgePath(a0: number, a1: number): string {
  const [x0, y0] = pt(a0, R);
  const [x1, y1] = pt(a1, R);
  const [x2, y2] = pt(a1, RIN);
  const [x3, y3] = pt(a0, RIN);
  return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${RIN} ${RIN} 0 0 0 ${x3} ${y3} Z`;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SectionSheet({ section, onClose }: { section: PizzaSection; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    backRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      // Focus trap: cycle Tab / Shift+Tab inside the sheet.
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const HeaderIcon = iconFor(section.icon);

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="pizza-sheet fixed inset-0 z-40 flex flex-col bg-white dark:bg-neutral-950"
    >
      <button
        ref={backRef}
        type="button"
        onClick={onClose}
        aria-label="Wróć do menu"
        className="absolute left-0 top-0 z-50 flex h-[86px] w-[86px] items-start justify-start p-3 text-2xl leading-none text-white transition [clip-path:polygon(0_0,100%_0,0_100%)] bg-black/30 hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-white"
      >
        ↩
      </button>

      <div
        className="px-6 pb-6 pt-16 text-white"
        style={{
          background: `linear-gradient(150deg, ${section.colors[0]}, ${section.colors[1]})`
        }}
      >
        <HeaderIcon className="h-10 w-10" aria-hidden="true" />
        <h2 id={titleId} className="mt-2 text-2xl font-extrabold leading-tight">
          {section.title}
        </h2>
        <p className="mt-1 text-sm font-medium opacity-90">{section.desc}</p>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-8 pt-5">
        <ul className="space-y-2.5">
          {section.services.map((s) => {
            const RowIcon = iconFor(s.icon);
            const rowInner = (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `${section.colors[0]}1a`, color: section.colors[1] }}
                >
                  <RowIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-[15px] font-bold text-neutral-900 dark:text-neutral-100">
                  {s.label}
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  {s.priceLabel}
                </span>
              </>
            );
            const rowClass =
              'flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900';
            return (
              <li key={s.key}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className={`${rowClass} transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:hover:border-orange-700 dark:hover:bg-orange-950/30`}
                  >
                    {rowInner}
                  </Link>
                ) : (
                  <div className={`${rowClass} opacity-60`}>{rowInner}</div>
                )}
              </li>
            );
          })}
        </ul>
        {section.soon && section.soonNote && (
          <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-500">
            {section.soonNote}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PizzaMenu({ sections }: { sections: PizzaSection[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sliceAngle = 360 / sections.length;
  const openSection = sections.find((s) => s.id === openId) ?? null;

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Prototype's pop-in animation, honoring prefers-reduced-motion. */}
      <style>{`
        @keyframes pizza-pop { from { transform: scale(0.6); opacity: 0; border-radius: 50%; } to { transform: scale(1); opacity: 1; border-radius: 0; } }
        .pizza-sheet { animation: pizza-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .pizza-slice { cursor: pointer; transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); transform-origin: 250px 250px; outline: none; }
        .pizza-slice:hover, .pizza-slice:focus-visible { transform: scale(1.045); }
        .pizza-slice:active { transform: scale(0.97); }
        @media (prefers-reduced-motion: reduce) { .pizza-sheet { animation: none; } .pizza-slice { transition: none; } }
      `}</style>

      <svg
        viewBox="0 0 500 500"
        role="menu"
        aria-label="Kategorie usług JOKUS"
        className="block h-auto w-full drop-shadow-[0_14px_34px_rgba(40,20,5,0.22)]"
      >
        <defs>
          {sections.map((s) => (
            <linearGradient key={s.id} id={`pizza-g-${s.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={s.colors[0]} />
              <stop offset="1" stopColor={s.colors[1]} />
            </linearGradient>
          ))}
        </defs>

        {sections.map((s, i) => {
          const a0 = i * sliceAngle + GAP / 2;
          const a1 = (i + 1) * sliceAngle - GAP / 2;
          const mid = i * sliceAngle + sliceAngle / 2;
          const [lx, ly] = pt(mid, LR);
          const SliceIcon = iconFor(s.icon);
          return (
            <g
              key={s.id}
              role="menuitem"
              tabIndex={0}
              aria-label={s.title}
              className="pizza-slice"
              onClick={() => setOpenId(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenId(s.id);
                }
              }}
            >
              <path
                d={wedgePath(a0, a1)}
                fill={`url(#pizza-g-${s.id})`}
                stroke="currentColor"
                strokeWidth={2}
                className="text-white dark:text-neutral-950"
              />
              <SliceIcon
                x={lx - 15}
                y={ly - 40}
                width={30}
                height={30}
                color="#ffffff"
                strokeWidth={2}
                aria-hidden="true"
                focusable="false"
              />
              <text
                x={lx}
                y={ly + 10}
                textAnchor="middle"
                fill="#fff"
                fontWeight={800}
                fontSize={16.5}
                letterSpacing={0.2}
                style={{ pointerEvents: 'none' }}
              >
                {s.l1}
              </text>
              {s.l2 && (
                <text
                  x={lx}
                  y={ly + 27}
                  textAnchor="middle"
                  fill="#fff"
                  fontWeight={600}
                  fontSize={12}
                  opacity={0.92}
                  style={{ pointerEvents: 'none' }}
                >
                  {s.l2}
                </text>
              )}
            </g>
          );
        })}

        {/* Center hole with the logo. */}
        <circle cx={CX} cy={CY} r={RIN - 6} className="fill-white dark:fill-neutral-950" />
        <text
          x={CX}
          y={CY + 9}
          textAnchor="middle"
          fontWeight={800}
          fontSize={26}
          letterSpacing={-1}
          className="fill-neutral-900 dark:fill-neutral-50"
          style={{ pointerEvents: 'none' }}
        >
          JOK
          <tspan fill="#ff6a2b">U</tspan>S
        </text>
      </svg>

      <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-500">
        Kliknij kawałek, aby otworzyć sekcję · trójkąt w rogu lub Escape wraca do menu
      </p>

      {openSection && <SectionSheet section={openSection} onClose={() => setOpenId(null)} />}
    </div>
  );
}
