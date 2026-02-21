import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, http } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { adiTestnet } from '@/lib/chain';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import { useSmartAccount } from './use-smart-account';

export function useUserStatus() {
  const { authenticated } = usePrivy();
  const { displayAddress: walletAddress } = useSmartAccount();

  return useQuery({
    queryKey: ['userStatus', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return {
          isWhitelisted: false,
          isBlacklisted: false,
          canTrade: false,
        };
      }

      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      try {
        const isWhitelisted = await publicClient.readContract({
          address: CONTRACTS.UserRegistry.address,
          abi: CONTRACTS.UserRegistry.abi,
          functionName: 'isWhitelisted',
          args: [walletAddress as `0x${string}`],
        });

        const isBlacklisted = await publicClient.readContract({
          address: CONTRACTS.UserRegistry.address,
          abi: CONTRACTS.UserRegistry.abi,
          functionName: 'isBlacklisted',
          args: [walletAddress as `0x${string}`],
        });

        return {
          isWhitelisted: isWhitelisted as boolean,
          isBlacklisted: isBlacklisted as boolean,
          canTrade: (isWhitelisted as boolean) && !(isBlacklisted as boolean),
        };
      } catch (error) {
        console.error('Failed to fetch user status:', error);
        return {
          isWhitelisted: false,
          isBlacklisted: false,
          canTrade: false,
        };
      }
    },
    enabled: authenticated && !!walletAddress,
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });
}
