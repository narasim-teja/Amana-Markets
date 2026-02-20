import { defineChain } from 'viem';

export const adiTestnet = defineChain({
  id: 99999,
  name: 'ADI Testnet',
  network: 'adi-testnet',
  nativeCurrency: { name: 'ADI', symbol: 'ADI', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ADI_TESTNET_RPC || 'https://rpc.ab.testnet.adifoundation.ai/']
    },
    public: {
      http: ['https://rpc.ab.testnet.adifoundation.ai/']
    }
  },
  blockExplorers: {
    default: {
      name: 'ADI Explorer',
      url: 'https://explorer.ab.testnet.adifoundation.ai'
    }
  }
});
