'use client';

/**
 * Smart Account Hook
 * Derives the SimpleAccount address from the user's EOA (Privy wallet).
 * The smart account is the primary on-chain identity for AA users.
 */

import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, type Address } from 'viem';
import { adiTestnet } from '@/lib/chain';

const FACTORY: Address = '0x7a83a0FBB96273364527FDB2CE826961a76C0D63';
const ZERO = BigInt(0);

const FACTORY_ABI = [
  {
    type: 'function', name: 'getAddress', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'salt', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http(),
});

export function useSmartAccount() {
  const { user, authenticated } = usePrivy();
  const eoaAddress = user?.wallet?.address as Address | undefined;

  const { data: smartAccount, isLoading } = useQuery({
    queryKey: ['smart-account', eoaAddress],
    queryFn: async () => {
      if (!eoaAddress) return null;
      try {
        const address = await publicClient.readContract({
          address: FACTORY,
          abi: FACTORY_ABI,
          functionName: 'getAddress',
          args: [eoaAddress, ZERO],
        });
        return address as Address;
      } catch {
        return null;
      }
    },
    enabled: authenticated && !!eoaAddress,
    staleTime: Infinity, // Deterministic — never changes for same EOA
  });

  return {
    smartAccount: smartAccount ?? undefined,
    eoaAddress,
    isLoading,
    /** Display address: smart account preferred; undefined while loading to prevent EOA flash */
    displayAddress: smartAccount ?? (isLoading ? undefined : eoaAddress),
  };
}
