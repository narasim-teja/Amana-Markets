'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, formatEther } from 'viem';
import { adiTestnet } from '@/lib/chain';

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

export function useAdiBalance() {
  const { user, authenticated } = usePrivy();
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined;

  const { data: balance, isLoading } = useQuery({
    queryKey: ['adi-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return '0';
      const raw = await publicClient.getBalance({ address: walletAddress });
      return formatEther(raw);
    },
    enabled: authenticated && !!walletAddress,
    refetchInterval: 15_000,
  });

  const formatted = balance
    ? parseFloat(balance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })
    : '0.00';

  return { balance: formatted, raw: balance ?? '0', isLoading };
}
