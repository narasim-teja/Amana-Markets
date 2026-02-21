'use client';

/**
 * Sponsored Contract Write Hook
 * Executes transactions via ERC-4337 smart account with gas sponsorship.
 *
 * Flow:
 *  1. Derive a SimpleAccount address from the user's EOA (Privy wallet)
 *  2. Request sponsorship from middleware for the smart account
 *  3. Build a proper v0.7 UserOperation
 *  4. Compute UserOp hash and sign with the EOA (as smart account owner)
 *  5. Submit to the bundler via middleware proxy
 *  6. Poll for receipt
 *
 * Falls back to standard EOA execution if sponsorship or bundler is unavailable.
 *
 * NOTE: The smart account address (not the EOA) must be whitelisted in UserRegistry
 * for sponsorship eligibility.
 */

import { useWallets } from '@privy-io/react-auth';
import { useState } from 'react';
import {
  createWalletClient,
  custom,
  createPublicClient,
  http,
  encodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  concat,
  toHex,
  type Address,
  type Abi,
  type Hex,
} from 'viem';
import { adiTestnet } from '@/lib/chain';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTRYPOINT: Address = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
const FACTORY: Address = '0x7a83a0FBB96273364527FDB2CE826961a76C0D63';

// ADI testnet gas values (base fee ~552 gwei)
// Using BigInt() instead of n-suffix for ES2017 target compat
const ZERO = BigInt(0);
const SHIFT_128 = BigInt(128);
const GAS = {
  verificationGasLimit: BigInt(200000),
  verificationGasLimitDeploy: BigInt(400000),
  callGasLimit: BigInt(500000),
  preVerificationGas: BigInt(60000),
  maxFeePerGas: BigInt('600000000000'),         // 600 gwei
  maxPriorityFeePerGas: BigInt('100000000000'), // 100 gwei
};

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const FACTORY_ABI = [
  {
    type: 'function', name: 'getAddress', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'salt', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function', name: 'createAccount', stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'salt', type: 'uint256' }],
    outputs: [{ name: 'ret', type: 'address' }],
  },
] as const;

const ENTRYPOINT_ABI = [
  {
    type: 'function', name: 'getNonce', stateMutability: 'view',
    inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }],
    outputs: [{ name: 'nonce', type: 'uint256' }],
  },
] as const;

const ACCOUNT_ABI = [
  {
    type: 'function', name: 'execute', stateMutability: 'nonpayable',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type SponsorshipMode = 'native' | 'erc20';

interface WriteContractParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the packed paymasterAndData into separate RPC fields */
function splitPaymasterAndData(paymasterAndData: Hex) {
  const hex = paymasterAndData.slice(2); // strip 0x
  const paymaster = ('0x' + hex.slice(0, 40)) as Address;
  // uint128 fields are 16 bytes = 32 hex chars each
  const paymasterVerificationGasLimit = toHex(BigInt('0x' + hex.slice(40, 72)));
  const paymasterPostOpGasLimit = toHex(BigInt('0x' + hex.slice(72, 104)));
  const paymasterData = ('0x' + hex.slice(104)) as Hex;
  return { paymaster, paymasterVerificationGasLimit, paymasterPostOpGasLimit, paymasterData };
}

/** Compute the ERC-4337 v0.7 UserOperation hash */
function computeUserOpHash(
  sender: Address,
  nonce: bigint,
  initCode: Hex,
  callData: Hex,
  verificationGasLimit: bigint,
  callGasLimit: bigint,
  preVerificationGas: bigint,
  maxPriorityFeePerGas: bigint,
  maxFeePerGas: bigint,
  paymasterAndData: Hex,
  chainId: bigint,
): Hex {
  // Pack gas fields into bytes32 values (v0.7 format)
  const accountGasLimits = toHex((verificationGasLimit << SHIFT_128) | callGasLimit, { size: 32 }) as Hex;
  const gasFees = toHex((maxPriorityFeePerGas << SHIFT_128) | maxFeePerGas, { size: 32 }) as Hex;

  // Inner hash over packed UserOp fields
  const packedHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, uint256, bytes32, bytes32, bytes32, uint256, bytes32, bytes32'),
      [
        sender,
        nonce,
        keccak256(initCode),
        keccak256(callData),
        accountGasLimits as `0x${string}`,
        preVerificationGas,
        gasFees as `0x${string}`,
        keccak256(paymasterAndData),
      ],
    ),
  );

  // Final hash includes entryPoint and chainId
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('bytes32, address, uint256'),
      [packedHash, ENTRYPOINT, chainId],
    ),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
      if (!wallet) throw new Error('No wallet connected.');

      try { await wallet.switchChain(adiTestnet.id); } catch {}

      const provider = await wallet.getEthereumProvider();
      const eoaAddress = wallet.address as Address;

      const publicClient = createPublicClient({ chain: adiTestnet, transport: http() });
      const bundlerUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/bundler';

      // ── 1. Derive smart account address ──────────────────────────────────
      let smartAccount: Address;
      try {
        smartAccount = await publicClient.readContract({
          address: FACTORY, abi: FACTORY_ABI, functionName: 'getAddress',
          args: [eoaAddress, ZERO],
        });
      } catch (e: any) {
        console.warn('[Sponsored Write] Failed to derive smart account:', e.message);
        toast.info('Smart account unavailable, using standard transaction');
        return await fallbackWrite(wallet, params);
      }

      // ── 2. Check if smart account is already deployed ────────────────────
      const code = await publicClient.getCode({ address: smartAccount });
      const isDeployed = !!code && code !== '0x';

      // ── 3. Get nonce from EntryPoint ─────────────────────────────────────
      const nonce = await publicClient.readContract({
        address: ENTRYPOINT, abi: ENTRYPOINT_ABI, functionName: 'getNonce',
        args: [smartAccount, ZERO],
      });

      // ── 4. Request sponsorship for the smart account ─────────────────────
      toast.info('Requesting gas sponsorship...');
      let sponsorship;
      try {
        sponsorship = await apiClient.requestSponsorship(smartAccount, mode);
      } catch (e: any) {
        console.warn('[Sponsored Write] Sponsorship unavailable:', e.message);
        toast.info('Sponsorship unavailable, using standard transaction');
        return await fallbackWrite(wallet, params);
      }

      // ── 5. Build callData: SimpleAccount.execute(target, 0, innerData) ───
      const innerCallData = encodeFunctionData({
        abi: params.abi, functionName: params.functionName, args: params.args || [],
      });
      const callData = encodeFunctionData({
        abi: ACCOUNT_ABI, functionName: 'execute',
        args: [params.address, ZERO, innerCallData],
      });

      // ── 6. Build initCode for first-time deployment ──────────────────────
      const factoryData = encodeFunctionData({
        abi: FACTORY_ABI, functionName: 'createAccount', args: [eoaAddress, ZERO],
      });
      const initCode: Hex = isDeployed ? '0x' : concat([FACTORY, factoryData]);
      const verificationGasLimit = isDeployed ? GAS.verificationGasLimit : GAS.verificationGasLimitDeploy;

      // ── 7. Parse paymaster fields ────────────────────────────────────────
      const pm = splitPaymasterAndData(sponsorship.paymasterAndData as Hex);

      // ── 8. Compute UserOp hash and sign ──────────────────────────────────
      const userOpHash = computeUserOpHash(
        smartAccount, nonce as bigint, initCode, callData,
        verificationGasLimit, GAS.callGasLimit, GAS.preVerificationGas,
        GAS.maxPriorityFeePerGas, GAS.maxFeePerGas,
        sponsorship.paymasterAndData as Hex, BigInt(adiTestnet.id),
      );

      // personal_sign: wallet adds EIP-191 prefix, SimpleAccount does the same in _validateSignature
      const signature = await provider.request({
        method: 'personal_sign',
        params: [userOpHash, eoaAddress],
      }) as Hex;

      // ── 9. Build UserOp for bundler (v0.7 RPC format) ───────────────────
      const userOp: Record<string, any> = {
        sender: smartAccount,
        nonce: toHex(nonce as bigint),
        callData,
        callGasLimit: toHex(GAS.callGasLimit),
        verificationGasLimit: toHex(verificationGasLimit),
        preVerificationGas: toHex(GAS.preVerificationGas),
        maxFeePerGas: toHex(GAS.maxFeePerGas),
        maxPriorityFeePerGas: toHex(GAS.maxPriorityFeePerGas),
        paymaster: pm.paymaster,
        paymasterVerificationGasLimit: pm.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: pm.paymasterPostOpGasLimit,
        paymasterData: pm.paymasterData,
        signature,
      };

      // Add factory fields only for first deployment
      if (!isDeployed) {
        userOp.factory = FACTORY;
        userOp.factoryData = factoryData;
      }

      // ── 10. Submit to bundler ────────────────────────────────────────────
      toast.info('Submitting sponsored transaction...');
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_sendUserOperation',
            params: [userOp, ENTRYPOINT],
            id: 1,
          }),
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || 'Bundler rejected UserOperation');
        }

        const opHash = result.result as string;
        setTxHash(opHash);
        toast.success('Sponsored transaction submitted', {
          description: `UserOp: ${opHash.slice(0, 10)}...${opHash.slice(-8)}`,
        });

        // ── 11. Poll for receipt ──────────────────────────────────────────
        let receipt = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const res = await fetch(bundlerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getUserOperationReceipt',
                params: [opHash],
                id: 1,
              }),
            });
            const r = await res.json();
            if (r.result) { receipt = r.result; break; }
          } catch { /* continue polling */ }
        }

        if (receipt) {
          toast.success('Sponsored transaction confirmed!', { description: 'Gas was paid by the platform' });
        } else {
          toast.info('Transaction submitted, confirmation pending');
        }

        setIsLoading(false);
        return { hash: opHash, receipt };
      } catch (bundlerError: any) {
        console.warn('[Sponsored Write] Bundler error:', bundlerError.message);
        toast.info('Bundler unavailable, using standard transaction');
        return await fallbackWrite(wallet, params);
      }
    } catch (err: any) {
      console.error('[Sponsored Write] Error:', err);
      setError(err);
      setIsLoading(false);
      toast.error('Transaction failed', { description: err.message?.slice(0, 100) });
      throw err;
    }
  };

  // ── Fallback: standard EOA transaction ────────────────────────────────────
  const fallbackWrite = async (wallet: any, params: WriteContractParams) => {
    const provider = await wallet.getEthereumProvider();

    const walletClient = createWalletClient({
      chain: adiTestnet,
      transport: custom(provider),
      account: wallet.address as Address,
    });

    const publicClient = createPublicClient({ chain: adiTestnet, transport: http() });

    try {
      await publicClient.simulateContract({
        address: params.address, abi: params.abi,
        functionName: params.functionName, args: params.args || [],
        account: wallet.address as Address,
      });
    } catch (simError: any) {
      const reason = simError.shortMessage || simError.metaMessages?.[0] ||
        simError.message?.slice(0, 120) || 'Transaction would revert on-chain';
      setIsLoading(false);
      setError(simError);
      toast.error('Transaction will fail', { description: reason });
      throw new Error(reason);
    }

    const hash = await walletClient.writeContract({
      address: params.address, abi: params.abi,
      functionName: params.functionName, args: params.args || [],
      account: wallet.address as Address,
    });

    setTxHash(hash);
    toast.success('Transaction submitted', {
      description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

    if (receipt.status === 'success') {
      toast.success('Transaction confirmed!', { description: `Block: ${receipt.blockNumber}` });
    } else {
      toast.error('Transaction failed', { description: 'The transaction was reverted' });
    }

    setIsLoading(false);
    return { hash, receipt };
  };

  return { writeContract, isLoading, error, txHash };
}
