// Fetches the global module catalog from Supabase.
//
// Phase 1: returns all `is_global = true` modules sorted by `sort_order`.
// Per-estate filtering via `module_activations` will land in Phase 2,
// once residents are bound to an estate during onboarding.
//
// The data is cached for 5 minutes (Providers.tsx defaults) — modules
// change rarely, so a single fetch per session is plenty.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { MODULE_CATEGORY_ORDER, type Module, type ModuleCategory } from '@/lib/types/modules';

const MODULES_QUERY_KEY = ['modules', 'global'] as const;

async function fetchGlobalModules(): Promise<Module[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('is_global', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    // Let TanStack Query handle retry + error state; just surface the message.
    throw new Error(`Nie udało się pobrać modułów: ${error.message}`);
  }

  // `database.ts` is a permissive stub, so Supabase returns rows as
  // `Record<string, unknown>`. Assert to our hand-written shape — see
  // REVIEW_REPORT.md #5 for the plan to replace this with real codegen.
  return (data ?? []) as unknown as Module[];
}

/**
 * Group modules by category, preserving the canonical category display order
 * from `MODULE_CATEGORY_ORDER`. Empty categories are omitted from the result.
 */
export function groupByCategory(
  modules: Module[]
): Array<{ category: ModuleCategory; modules: Module[] }> {
  const bucket = new Map<ModuleCategory, Module[]>();

  for (const module of modules) {
    const existing = bucket.get(module.category);
    if (existing) {
      existing.push(module);
    } else {
      bucket.set(module.category, [module]);
    }
  }

  return MODULE_CATEGORY_ORDER.filter((category) => bucket.has(category)).map((category) => ({
    category,
    modules: bucket.get(category)!
  }));
}

export function useModules() {
  return useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: fetchGlobalModules
  });
}
