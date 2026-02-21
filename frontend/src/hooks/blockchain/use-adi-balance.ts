'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, formatEther } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { useSmartAccount } from './use-smart-account';

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

export function useAdiBalance() {
  const { displayAddress } = useSmartAccount();

  const { data: balance, isLoading } = useQuery({
    queryKey: ['adi-balance', displayAddress],
    queryFn: async () => {
      if (!displayAddress) return '0';
      const raw = await publicClient.getBalance({ address: displayAddress });
      return formatEther(raw);
    },
    enabled: !!displayAddress,
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
