// /users (admin) — full directory of users (residents, jokusors, admins).
// Distinct from /jokusors, which stays a review queue for pending applications.
// Admin-gated; reads run through the service-role client (server-only, like
// /jokusors) and load defensively — any failure renders a readable message.
//
// URL-driven filters (?role=&q=) mirror the marketplace pattern so the view is
// shareable and the server re-runs the query on change.

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AlertTriangle, ChevronLeft, Mail, MapPin, Phone, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/formatters';
import UsersFilters from '@/components/admin/UsersFilters';

type Role = 'resident' | 'jokusor' | 'admin';

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  oauth_provider: string | null;
  created_at: string;
};

type JokInfo = {
  estate_id: string | null;
  service_postal_codes: string[] | null;
  service_streets: string[] | null;
  hasArea: boolean;
  business_name: string | null;
  rating: number | null;
  completed_jobs_count: number | null;
  is_active: boolean | null;
  onboarding_status: string | null;
};

const ROLE_BADGE: Record<Role, { label: string; cls: string }> = {
  resident: {
    label: 'Mieszkaniec',
    cls: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  },
  jokusor: {
    label: 'Jokusor',
    cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
  },
  admin: {
    label: 'Admin',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  }
};

const ONBOARDING_BADGE: Record<string, { label: string; cls: string }> = {
  pending: {
    label: 'Oczekuje',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  },
  documents_review: {
    label: 'Weryfikacja dokumentów',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  },
  approved: {
    label: 'Zatwierdzony',
    cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
  },
  rejected: {
    label: 'Odrzucony',
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  }
};

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  email: 'e-mail'
};

const VALID_ROLES: Role[] = ['resident', 'jokusor', 'admin'];

type SearchParams = Promise<{ role?: string; q?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
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

  // Sanitise filter inputs from the URL.
  const role = VALID_ROLES.includes(sp.role as Role) ? (sp.role as Role) : 'all';
  // Strip characters that are grammar in a PostgREST .or() filter (commas,
  // parens) or LIKE wildcards (%, _), so search stays a plain substring match.
  const q = (sp.q ?? '')
    .replace(/[,%_()*]/g, ' ')
    .trim()
    .slice(0, 80);

  let loadError: string | null = null;
  let users: UserRow[] = [];
  const jokMap = new Map<string, JokInfo>();
  const estatesMap = new Map<string, string>();

  try {
    const admin = createAdminClient();

    let uq = admin
      .from('users')
      .select('id, full_name, email, phone, role, oauth_provider, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (role !== 'all') uq = uq.eq('role', role);
    if (q) uq = uq.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

    const { data: usersRaw, error: uErr } = await uq.limit(200);
    if (uErr) throw new Error(`Odczyt użytkowników: ${uErr.message}`);
    users = (usersRaw as UserRow[] | null) ?? [];

    const jokusorIds = users.filter((u) => u.role === 'jokusor').map((u) => u.id);
    if (jokusorIds.length > 0) {
      const { data: jokRaw, error: jErr } = await admin
        .from('jokusors')
        .select(
          'user_id, estate_id, service_postal_codes, service_streets, service_area, business_name, rating, completed_jobs_count, is_active, onboarding_status'
        )
        .in('user_id', jokusorIds);
      if (jErr) throw new Error(`Odczyt jokusorów: ${jErr.message}`);

      type JokRaw = {
        user_id: string;
        estate_id: string | null;
        service_postal_codes: string[] | null;
        service_streets: string[] | null;
        service_area: unknown;
        business_name: string | null;
        rating: number | null;
        completed_jobs_count: number | null;
        is_active: boolean | null;
        onboarding_status: string | null;
      };
      for (const j of (jokRaw as JokRaw[] | null) ?? []) {
        jokMap.set(j.user_id, {
          estate_id: j.estate_id,
          service_postal_codes: j.service_postal_codes,
          service_streets: j.service_streets,
          hasArea: j.service_area != null,
          business_name: j.business_name,
          rating: j.rating,
          completed_jobs_count: j.completed_jobs_count,
          is_active: j.is_active,
          onboarding_status: j.onboarding_status
        });
      }

      const estateIds = Array.from(
        new Set(
          Array.from(jokMap.values())
            .map((j) => j.estate_id)
            .filter((x): x is string => Boolean(x))
        )
      );
      if (estateIds.length > 0) {
        const { data: es } = await admin.from('estates').select('id, name').in('id', estateIds);
        for (const e of (es as { id: string; name: string }[] | null) ?? []) {
          estatesMap.set(e.id, e.name);
        }
      }
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Nieznany błąd ładowania.';
    console.error('[/admin/users] load', e);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Panel
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Użytkownicy
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Wszyscy mieszkańcy, jokusorzy i admini. Dla jokusorów widać obsługiwany obszar.
        </p>
      </header>

      {loadError ? (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <div className="text-sm text-red-900 dark:text-red-200">
            <p className="font-semibold">Nie udało się załadować listy</p>
            <p className="mt-1 break-words font-mono text-xs">{loadError}</p>
            <p className="mt-2">
              Jeśli mowa o kluczu serwisowym — ustaw SUPABASE_SERVICE_ROLE_KEY w Vercelu i zrób
              redeploy. Inny komunikat prześlij Claude.
            </p>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <Suspense fallback={null}>
              <UsersFilters />
            </Suspense>
          </section>

          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
            {users.length} {users.length === 1 ? 'użytkownik' : 'użytkowników'}
          </p>

          <section className="mt-3 space-y-4">
            {users.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <Users
                  className="h-10 w-10 text-neutral-400 dark:text-neutral-600"
                  aria-hidden="true"
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Brak użytkowników pasujących do filtrów.
                </p>
              </div>
            ) : (
              users.map((u) => {
                const badge = ROLE_BADGE[u.role];
                const jok = u.role === 'jokusor' ? jokMap.get(u.id) : undefined;
                const providerLabel = u.oauth_provider
                  ? (PROVIDER_LABEL[u.oauth_provider] ?? u.oauth_provider)
                  : null;

                return (
                  <article
                    key={u.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                          {u.full_name || '—'}
                        </h2>
                        <div className="mt-1 space-y-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                          <p className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                            <span className="truncate">{u.email || '—'}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                            {u.phone || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        {providerLabel && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            {providerLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {jok && (
                      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                            Obszar
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                jok.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                  : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {jok.is_active ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                            {jok.onboarding_status && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  ONBOARDING_BADGE[jok.onboarding_status]?.cls ??
                                  'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}
                              >
                                {ONBOARDING_BADGE[jok.onboarding_status]?.label ??
                                  jok.onboarding_status}
                              </span>
                            )}
                            <Link
                              href={`/jokusors/${u.id}/billing`}
                              className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            >
                              Rozliczenia
                            </Link>
                          </div>
                        </div>

                        <dl className="mt-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-500">
                              Osiedle:{' '}
                            </span>
                            {jok.estate_id ? (estatesMap.get(jok.estate_id) ?? '—') : '—'}
                            {jok.business_name ? ` · ${jok.business_name}` : ''}
                          </div>
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-500">Kody: </span>
                            {jok.service_postal_codes?.length
                              ? jok.service_postal_codes.join(', ')
                              : '—'}
                          </div>
                          {jok.service_streets?.length ? (
                            <div>
                              <span className="text-neutral-500 dark:text-neutral-500">
                                Ulice:{' '}
                              </span>
                              {jok.service_streets.join(', ')}
                            </div>
                          ) : null}
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-500">
                              Obszar na mapie:{' '}
                            </span>
                            {jok.hasArea ? 'tak' : 'nie'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star
                              className="h-3.5 w-3.5 text-amber-500"
                              aria-hidden="true"
                              fill="currentColor"
                            />
                            {jok.rating != null ? jok.rating.toFixed(1) : '—'} ·{' '}
                            {jok.completed_jobs_count ?? 0} zleceń
                          </div>
                        </dl>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
                      Dołączył(a): {formatDate(u.created_at)}
                    </p>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}
    </main>
  );
}
