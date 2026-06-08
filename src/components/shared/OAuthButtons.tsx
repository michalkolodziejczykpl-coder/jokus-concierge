'use client';

// OAuth sign-in buttons. Order matters: Google first (highest conversion),
// then Facebook (35+ demographic), Apple last (iOS App Store requirement).
//
// IMPORTANT: the Supabase client is created lazily inside the click handler.
// Creating it at render time breaks `next build` because env vars
// (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are required and
// may be empty during static analysis.
//
// redirectTo uses the CURRENT origin (window.location.origin), not a fixed
// APP_URL — so login works on whichever domain the user is on (jokus.pl AND
// migmig.pl). A hardcoded base would bounce the flow to the other domain and
// break the PKCE cookie (set on the origin where sign-in started).

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

type Provider = 'google' | 'facebook' | 'apple';

// Only Google is wired up end-to-end. Facebook is paused pending Meta Business
// Verification; Apple is bundled with Stage 2 native. Re-add entries below when
// each provider is enabled in Supabase Auth → Sign In / Providers.
const PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: 'google', label: 'Kontynuuj z Google' }
];

export function OAuthButtons({ className }: { className?: string }) {
  async function signIn(provider: Provider) {
    const supabase = createClient();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://www.jokus.pl';
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/callback` }
    });
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => signIn(p.id)}
          className="rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
