// Server-side helper: fetch the authenticated resident's default address,
// using the Server Component Supabase client (RLS applies, so this only ever
// returns the caller's own address).
//
// Use this inside Server Components / Route Handlers when you need to gate
// behaviour on whether the user has finished onboarding.

import { createClient } from '@/lib/supabase/server';
import type { Address } from '@/lib/types/addresses';

export async function getDefaultAddress(): Promise<Address | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    // Log to server console but don't throw — caller decides what to do.
    console.error('[getDefaultAddress]', error);
    return null;
  }

  return (data ?? null) as Address | null;
}
