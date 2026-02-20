'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { CONTRACTS } from '@/lib/contracts';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

/**
 * Reads the on-chain stablecoinPerUsd (FX rate) from TradingEngine.
 * Value is stored with 8 decimals, e.g. 367250000 = 3.6725 AED/USD.
 * Returns the rate as a plain number (e.g. 3.6725).
 */
export function useFxRate() {
  const { data, isLoading } = useQuery({
    queryKey: ['fx-rate'],
    queryFn: async () => {
      const raw = (await publicClient.readContract({
        address: CONTRACTS.TradingEngine.address,
        abi: CONTRACTS.TradingEngine.abi,
        functionName: 'stablecoinPerUsd',
      })) as bigint;
      return Number(raw) / 1e8;
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
    staleTime: REFETCH_INTERVAL_SLOW,
  });

  return {
    rate: data ?? 3.6725, // fallback to default peg
    isLoading,
  };
}
