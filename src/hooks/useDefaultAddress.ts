// Resident's default delivery address (`is_default = true`). Used by the
// module detail page to decide whether to send the user through onboarding.
//
// We deliberately don't auto-create an address — onboarding is an explicit
// step so the user knows which address is on file.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Address } from '@/lib/types/addresses';

const DEFAULT_ADDRESS_KEY = ['addresses', 'default'] as const;

async function fetchDefaultAddress(): Promise<Address | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać adresu: ${error.message}`);
  }

  return (data ?? null) as unknown as Address | null;
}

export function useDefaultAddress() {
  return useQuery({
    queryKey: DEFAULT_ADDRESS_KEY,
    queryFn: fetchDefaultAddress
  });
}
