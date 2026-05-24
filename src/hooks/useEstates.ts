// Fetches active estates, sorted alphabetically — backs the onboarding
// dropdown. Active estates rarely change (new launches are admin-only), so
// the 5-minute Providers default is plenty.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Estate } from '@/lib/types/estates';

const ESTATES_QUERY_KEY = ['estates', 'active'] as const;

async function fetchActiveEstates(): Promise<Estate[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('estates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać osiedli: ${error.message}`);
  }

  return (data ?? []) as unknown as Estate[];
}

export function useEstates() {
  return useQuery({
    queryKey: ESTATES_QUERY_KEY,
    queryFn: fetchActiveEstates
  });
}
