'use client';

/**
 * Sponsorship Status Hook
 * Fetches the user's gas sponsorship eligibility and rate limit info.
 * Uses the smart account address (not EOA) since that's what the middleware checks.
 * Returns null when paymaster is disabled.
 */

import { useQuery } from '@tanstack/react-query';
import { REFETCH_INTERVAL_MEDIUM, STALE_TIME_DEFAULT } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';
import { useSmartAccount } from './use-smart-account';

export interface SponsorshipStatus {
  eligible: boolean;
  whitelisted: boolean;
  sponsoredThisHour: number;
  hourlyLimit: number;
  totalSponsored: number;
  paymasterEnabled: boolean;
}

export function useSponsorshipStatus() {
  const { smartAccount } = useSmartAccount();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sponsorship-status', smartAccount],
    queryFn: async () => {
      if (!smartAccount) return null;
      return apiClient.getSponsorshipStatus(smartAccount);
    },
    enabled: !!smartAccount,
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
