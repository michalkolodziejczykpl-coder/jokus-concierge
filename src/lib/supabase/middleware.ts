// Refreshes the Supabase session on every request and forwards updated cookies.
// Wire this into a Next.js proxy.ts at project root (Next 16 renamed middleware → proxy).
//
// If Supabase env vars are missing (e.g. before .env.local is filled), we no-op
// and let the request through. This keeps the dev server usable during setup.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[supabase/middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — skipping session refresh. Fill .env.local to enable auth.'
      );
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: '', ...options });
      }
    }
  });

  // Touch the session so it refreshes if needed.
  await supabase.auth.getUser();

  return response;
}
