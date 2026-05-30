// /jokusors (admin) — review pending jokusor applications.
// Admin-gated. Documents live in a PRIVATE bucket, so we mint short-lived
// signed URLs with the service-role client for the reviewer to open them.

import { redirect } from 'next/navigation';
import { ChevronLeft, FileText, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ApplicationActions from '@/components/admin/ApplicationActions';

type Row = {
  user_id: string;
  service_postal_codes: string[] | null;
  bio: string | null;
  business_name: string | null;
  nip: string | null;
  background_check_url: string | null;
  insurance_doc_url: string | null;
  onboarding_status: string;
  created_at: string;
  users: { full_name: string | null; email: string } | null;
  estates: { name: string } | null;
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

  const admin = createAdminClient();
  const { data: rowsRaw, error } = await admin
    .from('jokusors')
    .select(
      'user_id, service_postal_codes, bio, business_name, nip, background_check_url, insurance_doc_url, onboarding_status, created_at, users:user_id(full_name, email), estates:estate_id(name)'
    )
    .in('onboarding_status', ['pending', 'documents_review'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[/admin/jokusors] fetch', error);
    throw new Error('Nie udało się załadować zgłoszeń');
  }

  const rows = (rowsRaw as unknown as Row[] | null) ?? [];

  const applications = await Promise.all(
    rows.map(async (r) => {
      const sign = async (path: string | null) =>
        path
          ? ((await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL)).data?.signedUrl ??
            null)
          : null;
      return {
        ...r,
        bgUrl: await sign(r.background_check_url),
        ocUrl: await sign(r.insurance_doc_url)
      };
    })
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Panel
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Zgłoszenia jokusorów
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Sprawdź dokumenty (w tym zaświadczenie o niekaralności) przed zatwierdzeniem.
        </p>
      </header>

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
                    {a.users?.full_name || a.users?.email || 'Bez nazwy'}
                  </h2>
                  <p className="text-sm text-neutral-500">{a.users?.email}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Do weryfikacji
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  {a.estates?.name ?? 'Osiedle —'} · kody:{' '}
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
    </main>
  );
}
