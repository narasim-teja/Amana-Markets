'use client';

/**
 * Sponsored Contract Write Hook
 * Executes transactions with ERC-4337 gas sponsorship via the middleware.
 *
 * Flow:
 *  1. Build the UserOperation calldata (same params as useContractWrite)
 *  2. Request sponsorship from middleware (POST /sponsor/{native|erc20})
 *  3. Attach paymasterAndData to the UserOp
 *  4. Submit to the bundler (eth_sendUserOperation)
 *  5. Wait for the UserOp to be included, show toasts
 *
 * Falls back to standard EOA execution if paymaster is unavailable.
 */

import { useWallets } from '@privy-io/react-auth';
import { useState } from 'react';
import {
  createWalletClient,
  custom,
  createPublicClient,
  http,
  encodeFunctionData,
  type Address,
  type Abi,
  type Hex,
} from 'viem';
import { adiTestnet } from '@/lib/chain';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

type SponsorshipMode = 'native' | 'erc20';

interface WriteContractParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
}

export function useSponsoredWrite(mode: SponsorshipMode = 'native') {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const writeContract = async (params: WriteContractParams) => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet connected. Please connect your wallet first.');
      }

      // Switch to ADI Testnet if needed
      try {
        await wallet.switchChain(adiTestnet.id);
      } catch (switchError: any) {
        console.warn('[Sponsored Write] Chain switch warning:', switchError.message);
      }

      const provider = await wallet.getEthereumProvider();
      const sender = wallet.address as Address;

      // Step 1: Request sponsorship from middleware
      toast.info('Requesting gas sponsorship...');

      let sponsorship;
      try {
        sponsorship = await apiClient.requestSponsorship(sender, mode);
      } catch (sponsorError: any) {
        console.warn('[Sponsored Write] Sponsorship unavailable, falling back to standard tx:', sponsorError.message);
        toast.info('Sponsorship unavailable, using standard transaction');

        // Fallback: execute as normal EOA transaction
        return await fallbackWrite(wallet, params);
      }

      // Step 2: Encode calldata for the target contract call
      const callData = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
      });

      // Step 3: Build and submit UserOperation via bundler
      const bundlerUrl = sponsorship.bundlerUrl || 'http://localhost:4337';

      // Build UserOp
      const userOp = {
        sender,
        callData,
        paymasterAndData: sponsorship.paymasterAndData,
        // These will be filled by the bundler's eth_estimateUserOperationGas
        nonce: '0x0',
        initCode: '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        signature: '0x',
      };

      // Try to submit via bundler
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_sendUserOperation',
            params: [userOp, sponsorship.entryPoint],
            id: 1,
          }),
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || 'Bundler rejected UserOperation');
        }

        const userOpHash = result.result as string;
        setTxHash(userOpHash);

        toast.success('Sponsored transaction submitted', {
          description: `UserOp: ${userOpHash.slice(0, 10)}...${userOpHash.slice(-8)}`,
        });

        // Wait for UserOp receipt
        const publicClient = createPublicClient({
          chain: adiTestnet,
          transport: http(),
        });

        // Poll for the UserOp receipt via bundler
        let receipt = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const receiptResponse = await fetch(bundlerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getUserOperationReceipt',
                params: [userOpHash],
                id: 1,
              }),
            });
            const receiptResult = await receiptResponse.json();
            if (receiptResult.result) {
              receipt = receiptResult.result;
              break;
            }
          } catch {
            // Continue polling
          }
        }

        if (receipt) {
          toast.success('Sponsored transaction confirmed!', {
            description: 'Gas was paid by the platform',
          });
        } else {
          toast.info('Transaction submitted, confirmation pending');
        }

        setIsLoading(false);
        return { hash: userOpHash, receipt };
      } catch (bundlerError: any) {
        console.warn('[Sponsored Write] Bundler submission failed, falling back:', bundlerError.message);
        toast.info('Bundler unavailable, using standard transaction');
        return await fallbackWrite(wallet, params);
      }
    } catch (err: any) {
      console.error('[Sponsored Write] Error:', err);
      setError(err);
      setIsLoading(false);
      toast.error('Transaction failed', {
        description: err.message?.slice(0, 100),
      });
      throw err;
    }
  };

  // Fallback to standard EOA transaction (same as useContractWrite)
  const fallbackWrite = async (wallet: any, params: WriteContractParams) => {
    const provider = await wallet.getEthereumProvider();

    const walletClient = createWalletClient({
      chain: adiTestnet,
      transport: custom(provider),
      account: wallet.address as Address,
    });

    const publicClient = createPublicClient({
      chain: adiTestnet,
      transport: http(),
    });

    // Simulate first
    try {
      await publicClient.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args || [],
        account: wallet.address as Address,
      });
    } catch (simError: any) {
      const reason =
        simError.shortMessage ||
        simError.metaMessages?.[0] ||
        simError.message?.slice(0, 120) ||
        'Transaction would revert on-chain';
      setIsLoading(false);
      setError(simError);
      toast.error('Transaction will fail', { description: reason });
      throw new Error(reason);
    }

    const hash = await walletClient.writeContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args || [],
      account: wallet.address as Address,
    });

    setTxHash(hash);
    toast.success('Transaction submitted', {
      description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

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
  };

  return {
    writeContract,
    isLoading,
    error,
    txHash,
  };
}
