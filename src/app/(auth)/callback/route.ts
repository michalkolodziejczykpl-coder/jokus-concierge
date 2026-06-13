// Auth callback. Handles TWO entry shapes:
//   1. OAuth / PKCE — Supabase redirects here with ?code=... (Google login).
//   2. Email link  — magic-link / signup confirmation links carry
//      ?token_hash=...&type=email. These must be verified server-side with
//      verifyOtp; the older {{ .ConfirmationURL }} flow puts the session in the
//      URL hash, which a server route cannot read (it would bounce to /login).
// After a successful session we forward to ?next (onboarding/home).

import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/home';

  const supabase = await createClient();

  // 1. OAuth / PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // 2. Email link (magic link / signup)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback — bounce back to login with an error flag.
  return NextResponse.redirect(new URL('/login?error=auth_failed', url.origin));
}
