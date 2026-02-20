'use client';

/**
 * Contract Write Hook
 * Handles transaction execution with Privy wallet + viem
 */

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, type Address, type Abi } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { toast } from 'sonner';

interface WriteContractParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
}

export function useContractWrite() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const writeContract = async (params: WriteContractParams) => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Get the first wallet (Privy embedded or connected)
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet connected. Please connect your wallet first.');
      }

      console.log('[Contract Write] Switching to ADI Testnet (99999)...');

      // Switch to ADI Testnet if needed
      try {
        await wallet.switchChain(adiTestnet.id);
      } catch (switchError: any) {
        // If chain switch fails, try to continue anyway (might already be on correct chain)
        console.warn('[Contract Write] Chain switch warning:', switchError.message);
      }

      // Get Ethereum provider from Privy wallet
      const provider = await wallet.getEthereumProvider();

      // Create wallet client with Privy's provider
      const walletClient = createWalletClient({
        chain: adiTestnet,
        transport: custom(provider),
        account: wallet.address as Address,
      });

      console.log('[Contract Write] Simulating transaction...');

      // Create public client for simulation
      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      // Simulate the transaction first (optional but recommended)
      try {
        await publicClient.simulateContract({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args || [],
          account: wallet.address as Address,
        });
        console.log('[Contract Write] Simulation successful');
      } catch (simError: any) {
        console.warn('[Contract Write] Simulation warning:', simError.message);
        // Continue anyway - simulation might fail due to state changes
      }

      console.log('[Contract Write] Executing transaction...');

      // Execute the transaction
      const hash = await walletClient.writeContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
        account: wallet.address as Address,
      });

      setTxHash(hash);
      console.log('[Contract Write] Transaction submitted:', hash);

      // Show success toast
      toast.success('Transaction submitted', {
        description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      // Wait for confirmation
      console.log('[Contract Write] Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      console.log('[Contract Write] Transaction confirmed:', receipt.status);

      if (receipt.status === 'success') {
        toast.success('Transaction confirmed!', {
          description: `Block: ${receipt.blockNumber}`,
        });
      } else {
        toast.error('Transaction failed', {
          description: 'The transaction was reverted',
        });
      }

      setIsLoading(false);
      return { hash, receipt };
    } catch (err: any) {
      const error = err as Error;
      console.error('[Contract Write] Error:', error);
      setError(error);
      setIsLoading(false);

      // Show error toast
      toast.error('Transaction failed', {
        description: error.message.slice(0, 100),
      });

      throw error;
    }
  };

  return {
    writeContract,
    isLoading,
    error,
    txHash,
  };
}
