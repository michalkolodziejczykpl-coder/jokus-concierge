// /rejestracja/uzupelnij — step 2+3 of email registration.
//
// Reached from the magic link (/callback?next=/rejestracja/uzupelnij). Requires
// a session. If the resident already has a verified phone they've finished
// registration, so bounce them to /home. Otherwise render the client form that
// collects name + phone and runs the SMS OTP round-trip.
//
// This page lives under the (auth) group on purpose: it is one of the public-ish
// screens exempt from the phone-verification gate, so an unverified user can
// actually reach it.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RegisterCompleteForm from '@/components/shared/RegisterCompleteForm';

export default async function RegisterCompletePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, phone_verified')
    .eq('id', user.id)
    .maybeSingle();

  const row = profile as { full_name?: string | null; phone_verified?: boolean } | null;
  if (row?.phone_verified === true) {
    redirect('/home');
  }

  const initialFullName =
    row?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    '';

  // Default ON. The owner sets PHONE_OTP_ENABLED=false only while no SMS
  // provider is configured in Supabase (Authentication → Phone).
  const phoneOtpEnabled = process.env.PHONE_OTP_ENABLED !== 'false';

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Dokończ rejestrację</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Zostały dwie rzeczy: imię i nazwisko oraz potwierdzenie numeru telefonu.
        </p>
      </header>

      <RegisterCompleteForm initialFullName={initialFullName} phoneOtpEnabled={phoneOtpEnabled} />
    </div>
  );
}
