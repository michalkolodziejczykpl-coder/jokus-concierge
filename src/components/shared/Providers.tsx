'use client';

// Client-side providers tree.
// Wraps the app in TanStack Query so hooks like useModules / useOrder can use
// the same query cache. The QueryClient is created lazily with useState so it
// is stable across re-renders (Next.js App Router pattern — a module-level
// `new QueryClient()` would be shared between SSR requests).
//
// Future additions: AuthProvider for client-side session, ThemeProvider, etc.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Modules and other catalog data rarely change — 5 min is plenty.
            // Per-hook overrides take precedence.
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
