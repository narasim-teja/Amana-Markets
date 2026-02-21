import { Hono } from 'hono';
import { CONTRACTS } from '../../config/contracts';
import { adiTestnet } from '../../config/chain';

const config = new Hono();

/**
 * GET /config
 * Single source of truth for contract addresses and chain config.
 * Frontend fetches this instead of hardcoding env vars.
 */
config.get('/', (c) => {
  return c.json({
    contracts: {
      TradingEngine: CONTRACTS.TradingEngine.address,
      LiquidityVault: CONTRACTS.LiquidityVault.address,
      AssetRegistry: CONTRACTS.AssetRegistry.address,
      UserRegistry: CONTRACTS.UserRegistry?.address ?? null,
      MockDirham: process.env.MOCK_DIRHAM ?? null,
      OracleRouter: CONTRACTS.OracleRouter.address,
      PythAdapter: CONTRACTS.PythAdapter.address,
      DIAAdapter: CONTRACTS.DIAAdapter.address,
      RedStoneAdapter: CONTRACTS.RedStoneAdapter.address,
      ManualAdapter: CONTRACTS.ManualAdapter.address,
    },
    chain: {
      id: adiTestnet.id,
      name: adiTestnet.name,
      rpcUrl: adiTestnet.rpcUrls.default.http[0],
      blockExplorer: adiTestnet.blockExplorers?.default.url ?? null,
    },
  });
});

export default config;
