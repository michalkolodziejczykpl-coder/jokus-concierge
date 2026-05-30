// Shared authorization guards for route handlers.

import { createClient } from '@/lib/supabase/server';

export type AdminGate =
  | { error: 'unauthenticated' | 'forbidden'; status: number }
  | { error: null };

// Confirms the caller is a logged-in admin. Use BEFORE any service-role action.
export async function requireAdmin(): Promise<AdminGate> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated', status: 401 };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return { error: 'forbidden', status: 403 };
  }
  return { error: null };
}
