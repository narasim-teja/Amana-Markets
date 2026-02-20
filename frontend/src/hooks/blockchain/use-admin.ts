'use client';

/**
 * Admin Route Guard Hook
 * Checks if connected wallet is the contract owner (admin)
 */

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { CONTRACTS } from '@/lib/contracts';

export function useIsAdmin() {
  const { user, ready, authenticated } = usePrivy();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [owner, setOwner] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address?.toLowerCase();

  useEffect(() => {
    async function checkAdmin() {
      if (!ready) {
        setIsLoading(true);
        return;
      }

      if (!authenticated || !walletAddress) {
        setIsLoading(false);
        setIsAdmin(false);
        return;
      }

      try {
        // Create public client for reading
        const publicClient = createPublicClient({
          chain: adiTestnet,
          transport: http(),
        });

        // Read owner from TradingEngine contract
        const contractOwner = await publicClient.readContract({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'owner',
        }) as `0x${string}`;

        setOwner(contractOwner.toLowerCase());
        setIsAdmin(walletAddress === contractOwner.toLowerCase());
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [ready, authenticated, walletAddress]);

  return {
    isAdmin,
    isLoading,
    walletAddress,
    owner,
  };
}
