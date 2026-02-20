'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, formatUnits } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { CONTRACTS } from '@/lib/contracts';

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

export function useMaedBalance() {
  const { user, authenticated } = usePrivy();
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['maed-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { raw: BigInt(0), formatted: '0.00' };
      const raw = (await publicClient.readContract({
        address: CONTRACTS.MockDirham.address,
        abi: CONTRACTS.MockDirham.abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      })) as bigint;
      const formatted = parseFloat(formatUnits(raw, 6)).toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
      return { raw, formatted };
    },
    enabled: authenticated && !!walletAddress,
    refetchInterval: 10_000,
  });

  return {
    balance: data?.formatted ?? '0.00',
    raw: data?.raw ?? BigInt(0),
    isLoading,
  };
}
