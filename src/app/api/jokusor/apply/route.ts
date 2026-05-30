// POST /api/jokusor/apply — submit a jokusor application.
// Inserts the applicant's OWN jokusors row (RLS jokusors_insert_own forces
// is_active=false + onboarding_status in pending/documents_review). Document
// files are uploaded client-side to the private jokusor-documents bucket; we
// store their object PATHS here.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jokusorApplicationSchema } from '@/lib/utils/validators';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Already a jokusor? Nothing to apply for.
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role === 'jokusor') {
    return NextResponse.json({ error: 'already_jokusor' }, { status: 409 });
  }

  // Already applied?
  const { data: existing } = await supabase
    .from('jokusors')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'already_applied' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = jokusorApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const d = parsed.data;

  // Storage RLS stops a user from WRITING into someone else's folder, but the
  // applicant could still send a path that points at a different user's file.
  // The admin page mints signed URLs with the service role, so it would happily
  // surface that wrong document. Enforce the prefix here.
  const ownPrefix = `${user.id}/`;
  if (!d.background_check_url.startsWith(ownPrefix)) {
    return NextResponse.json({ error: 'invalid_document_path' }, { status: 400 });
  }
  if (d.insurance_doc_url && !d.insurance_doc_url.startsWith(ownPrefix)) {
    return NextResponse.json({ error: 'invalid_document_path' }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    estate_id: d.estate_id,
    service_postal_codes: d.service_postal_codes,
    bio: d.bio || null,
    business_name: d.business_name || null,
    nip: d.nip || null,
    bank_account: d.bank_account || null,
    background_check_url: d.background_check_url,
    insurance_doc_url: d.insurance_doc_url || null,
    is_active: false,
    onboarding_status: 'documents_review'
  };

  const { error: insertErr } = await supabase.from('jokusors').insert(payload as never);
  if (insertErr) {
    console.error('[POST /api/jokusor/apply] insert', insertErr);
    return NextResponse.json(
      { error: 'insert_failed', message: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
