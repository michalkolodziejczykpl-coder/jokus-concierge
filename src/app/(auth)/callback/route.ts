// OAuth callback. Supabase redirects here with ?code=... after the provider dance.
// We exchange the code for a session, then forward the user to onboarding or home.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback — bounce back to login with an error flag.
  return NextResponse.redirect(new URL('/login?error=oauth_failed', url.origin));
}
