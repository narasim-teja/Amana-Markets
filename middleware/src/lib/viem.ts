import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { adiTestnet } from '../config/chain';

export const publicClient = createPublicClient({
  chain: adiTestnet,
  transport: http()
});

const account = process.env.RELAYER_PRIVATE_KEY
  ? privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`)
  : null;

export const walletClient = account ? createWalletClient({
  account,
  chain: adiTestnet,
  transport: http()
}) : null;
