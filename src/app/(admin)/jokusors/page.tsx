// /jokusors (admin) — review pending jokusor applications.
// Admin-gated. Loads defensively: any config/query problem renders a readable
// message on the page instead of a generic 500. Documents live in a PRIVATE
// bucket, so we mint short-lived signed URLs with the service-role client.

import { redirect } from 'next/navigation';
import { AlertTriangle, ChevronLeft, FileText, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ApplicationActions from '@/components/admin/ApplicationActions';

type JokRow = {
  user_id: string;
  estate_id: string | null;
  service_postal_codes: string[] | null;
  bio: string | null;
  business_name: string | null;
  nip: string | null;
  background_check_url: string | null;
  insurance_doc_url: string | null;
  onboarding_status: string;
  created_at: string;
};

type Application = JokRow & {
  fullName: string | null;
  email: string | null;
  estateName: string | null;
  bgUrl: string | null;
  ocUrl: string | null;
};

const BUCKET = 'jokusor-documents';
const SIGNED_TTL = 600; // 10 min

export default async function AdminJokusorsPage() {
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

  let loadError: string | null = null;
  let applications: Application[] = [];

  try {
    const admin = createAdminClient();

    const { data: jokRaw, error: jErr } = await admin
      .from('jokusors')
      .select(
        'user_id, estate_id, service_postal_codes, bio, business_name, nip, background_check_url, insurance_doc_url, onboarding_status, created_at'
      )
      .in('onboarding_status', ['pending', 'documents_review'])
      .order('created_at', { ascending: true });
    if (jErr) throw new Error(`Odczyt zgłoszeń: ${jErr.message}`);

    const joks = (jokRaw as unknown as JokRow[] | null) ?? [];

    const userIds = Array.from(new Set(joks.map((j) => j.user_id)));
    const estateIds = Array.from(
      new Set(joks.map((j) => j.estate_id).filter((x): x is string => Boolean(x)))
    );

    const usersMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: us, error: uErr } = await admin
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      if (uErr) throw new Error(`Odczyt użytkowników: ${uErr.message}`);
      for (const u of (us as unknown as
        | { id: string; full_name: string | null; email: string | null }[]
        | null) ?? []) {
        usersMap.set(u.id, { full_name: u.full_name, email: u.email });
      }
    }

    const estatesMap = new Map<string, string>();
    if (estateIds.length > 0) {
      const { data: es } = await admin.from('estates').select('id, name').in('id', estateIds);
      for (const e of (es as unknown as { id: string; name: string }[] | null) ?? []) {
        estatesMap.set(e.id, e.name);
      }
    }

    const sign = async (path: string | null) => {
      if (!path) return null;
      try {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
        return data?.signedUrl ?? null;
      } catch {
        return null;
      }
    };

    applications = await Promise.all(
      joks.map(async (j) => {
        const u = usersMap.get(j.user_id);
        return {
          ...j,
          fullName: u?.full_name ?? null,
          email: u?.email ?? null,
          estateName: j.estate_id ? (estatesMap.get(j.estate_id) ?? null) : null,
          bgUrl: await sign(j.background_check_url),
          ocUrl: await sign(j.insurance_doc_url)
        };
      })
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Nieznany błąd ładowania.';
    console.error('[/admin/jokusors] load', e);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Strona główna
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Zgłoszenia jokusorów
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Sprawdź dokumenty (w tym zaświadczenie o niekaralności) przed zatwierdzeniem.
        </p>
      </header>

      {loadError ? (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <div className="text-sm text-red-900 dark:text-red-200">
            <p className="font-semibold">Nie udało się załadować panelu</p>
            <p className="mt-1 break-words font-mono text-xs">{loadError}</p>
            <p className="mt-2">
              Jeśli mowa o kluczu serwisowym — ustaw SUPABASE_SERVICE_ROLE_KEY w Vercelu i zrób
              redeploy. Inny komunikat prześlij Claude.
            </p>
          </div>
        </div>
      ) : (
        <section className="mt-8 space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              Brak zgłoszeń do rozpatrzenia.
            </div>
          ) : (
            applications.map((a) => (
              <article
                key={a.user_id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                      {a.fullName || a.email || 'Bez nazwy'}
                    </h2>
                    <p className="text-sm text-neutral-500">{a.email}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    Do weryfikacji
                  </span>
                </div>

                <dl className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    {a.estateName ?? 'Osiedle —'} · kody:{' '}
                    {a.service_postal_codes?.join(', ') || '—'}
                  </div>
                  {a.business_name && (
                    <div>
                      Firma: {a.business_name}
                      {a.nip ? ` · NIP ${a.nip}` : ''}
                    </div>
                  )}
                  {a.bio && (
                    <p className="whitespace-pre-line text-neutral-600 dark:text-neutral-400">
                      {a.bio}
                    </p>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  {a.bgUrl ? (
                    <a
                      href={a.bgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                      <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                      Zaświadczenie o niekaralności
                    </a>
                  ) : (
                    <span className="text-xs text-red-600">Brak zaświadczenia</span>
                  )}
                  {a.ocUrl && (
                    <a
                      href={a.ocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                      <FileText className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                      Polisa OC
                    </a>
                  )}
                </div>

                <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <ApplicationActions userId={a.user_id} />
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
