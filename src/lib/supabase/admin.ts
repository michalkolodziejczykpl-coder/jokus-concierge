// Service-role Supabase client. NEVER import from a Client Component.
// Use only in Route Handlers / Server Actions / Edge Functions that need to bypass RLS.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
