'use client';

/**
 * Sponsorship Status Hook
 * Fetches the user's gas sponsorship eligibility and rate limit info.
 * Returns null when paymaster is disabled.
 */

import { useQuery } from '@tanstack/react-query';
import { useWallets } from '@privy-io/react-auth';
import { REFETCH_INTERVAL_MEDIUM, STALE_TIME_DEFAULT } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';

export interface SponsorshipStatus {
  eligible: boolean;
  whitelisted: boolean;
  sponsoredThisHour: number;
  hourlyLimit: number;
  totalSponsored: number;
  paymasterEnabled: boolean;
}

export function useSponsorshipStatus() {
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  const { data, isLoading, error } = useQuery({
    queryKey: ['sponsorship-status', address],
    queryFn: async () => {
      if (!address) return null;
      return apiClient.getSponsorshipStatus(address);
    },
    enabled: !!address,
    refetchInterval: REFETCH_INTERVAL_MEDIUM,
    staleTime: STALE_TIME_DEFAULT,
  });

  return {
    status: data ?? null,
    isLoading,
    error,
    isEligible: data?.eligible ?? false,
    isEnabled: data?.paymasterEnabled ?? false,
    remaining: data ? data.hourlyLimit - data.sponsoredThisHour : 0,
  };
}
