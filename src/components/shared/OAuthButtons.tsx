'use client';

// OAuth sign-in buttons. Order matters: Google first (highest conversion),
// then Facebook (35+ demographic), Apple last (iOS App Store requirement).
//
// IMPORTANT: the Supabase client is created lazily inside the click handler.
// Creating it at render time breaks `next build` because env vars
// (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are required and
// may be empty during static analysis.

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { APP_URL } from '@/lib/constants';

type Provider = 'google' | 'facebook' | 'apple';

const PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: 'google', label: 'Kontynuuj z Google' },
  { id: 'facebook', label: 'Kontynuuj z Facebookiem' },
  { id: 'apple', label: 'Kontynuuj z Apple' }
];

export function OAuthButtons({ className }: { className?: string }) {
  async function signIn(provider: Provider) {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${APP_URL}/callback` }
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
