import { defineChain } from 'viem';

/**
 * ADI Testnet - Abu Dhabi Innovation Chain
 * Chain ID: 99999
 * Custom testnet for ADI Commodities Marketplace
 */
export const adiTestnet = defineChain({
  id: 99999,
  name: 'ADI Testnet',
  network: 'adi-testnet',
  nativeCurrency: {
    name: 'ADI',
    symbol: 'ADI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ab.testnet.adifoundation.ai/'],
    },
    public: {
      http: ['https://rpc.ab.testnet.adifoundation.ai/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ADI Explorer',
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.ab.testnet.adifoundation.ai',
    },
  },
  testnet: true,
});
