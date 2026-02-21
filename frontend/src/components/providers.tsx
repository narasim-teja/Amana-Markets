'use client';

/**
 * App Providers
 * Combines all context providers (Privy, TanStack Query)
 */

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { adiTestnet } from '@/lib/chain';
import {
  REFETCH_INTERVAL_FAST,
  REFETCH_INTERVAL_MEDIUM,
  STALE_TIME_DEFAULT,
} from '@/lib/constants';
import { initContracts } from '@/lib/contracts';
import { BrandingProvider } from '@/components/branding-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: STALE_TIME_DEFAULT,
            refetchInterval: REFETCH_INTERVAL_MEDIUM, // Default to medium refresh
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  // Fetch contract addresses from middleware API on app startup.
  // The CONTRACTS object is already usable (with env fallback values) before
  // this resolves; the fetch simply overwrites the addresses in place.
  useEffect(() => {
    initContracts();
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#C9A96E', // Gold accent matching brand
          logo: '/logo.png',
        },
        // Custom chain configuration (ADI Testnet not in Privy's default list)
        defaultChain: adiTestnet,
        supportedChains: [adiTestnet],

        // Login methods
        loginMethods: ['email', 'wallet', 'google'],

        // Embedded wallets for users without external wallets
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>{children}</BrandingProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
