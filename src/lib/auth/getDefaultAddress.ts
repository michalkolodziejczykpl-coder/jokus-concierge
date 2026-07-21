// Server-side helper: fetch the authenticated resident's default address.
//
// The query filters EXPLICITLY on user_id — RLS is the second layer, not the
// only one. Relying on RLS alone broke here for admins (addresses_admin_read
// exposes every user's default → maybeSingle got multiple rows → PGRST116 →
// the helper returned null and bounced an onboarded user back to onboarding).
//
// Use this inside Server Components / Route Handlers when you need to gate
// behaviour on whether the user has finished onboarding.

import { createClient } from '@/lib/supabase/server';
import type { Address } from '@/lib/types/addresses';

export async function getDefaultAddress(): Promise<Address | null> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    // Log to server console but don't throw — caller decides what to do.
    console.error('[getDefaultAddress]', error);
    return null;
  }

  return (data ?? null) as Address | null;
}
