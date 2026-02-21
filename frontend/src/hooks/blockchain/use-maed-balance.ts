'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, formatUnits } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { CONTRACTS } from '@/lib/contracts';
import { useSmartAccount } from './use-smart-account';

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

export function useMaedBalance() {
  const { displayAddress } = useSmartAccount();

  const { data, isLoading } = useQuery({
    queryKey: ['maed-balance', displayAddress],
    queryFn: async () => {
      if (!displayAddress) return { raw: BigInt(0), formatted: '0.00' };
      const raw = (await publicClient.readContract({
        address: CONTRACTS.MockDirham.address,
        abi: CONTRACTS.MockDirham.abi,
        functionName: 'balanceOf',
        args: [displayAddress],
      })) as bigint;
      const formatted = parseFloat(formatUnits(raw, 6)).toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
      return { raw, formatted };
    },
    enabled: !!displayAddress,
    refetchInterval: 10_000,
  });

  return {
    balance: data?.formatted ?? '0.00',
    raw: data?.raw ?? BigInt(0),
    isLoading,
  };
}
