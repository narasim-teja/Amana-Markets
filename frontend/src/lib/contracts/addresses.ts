/**
 * Smart Contract Addresses on ADI Testnet
 * All addresses are loaded from environment variables
 */

export const CONTRACT_ADDRESSES = {
  // Oracle Infrastructure
  OracleRouter: process.env.NEXT_PUBLIC_ORACLE_ROUTER as `0x${string}`,

  // Oracle Adapters
  PythAdapter: process.env.NEXT_PUBLIC_PYTH_ADAPTER as `0x${string}`,
  DIAAdapter: process.env.NEXT_PUBLIC_DIA_ADAPTER as `0x${string}`,
  RedStoneAdapter: process.env.NEXT_PUBLIC_REDSTONE_ADAPTER as `0x${string}`,

  // Core Trading Contracts
  TradingEngine: process.env.NEXT_PUBLIC_TRADING_ENGINE as `0x${string}`,
  LiquidityVault: process.env.NEXT_PUBLIC_LIQUIDITY_VAULT as `0x${string}`,
  AssetRegistry: process.env.NEXT_PUBLIC_ASSET_REGISTRY as `0x${string}`,
  UserRegistry: process.env.NEXT_PUBLIC_USER_REGISTRY as `0x${string}`,

  // Tokens
  MockDirham: process.env.NEXT_PUBLIC_MOCK_DIRHAM as `0x${string}`,

  // Commodity Tokens (fallback - will be loaded from API dynamically)
  XGOLD: process.env.NEXT_PUBLIC_XGOLD as `0x${string}`,
  XSILVER: process.env.NEXT_PUBLIC_XSILVER as `0x${string}`,
  XOIL: process.env.NEXT_PUBLIC_XOIL as `0x${string}`,
} as const;

/**
 * Validate that all required contract addresses are set
 */
export function validateContractAddresses() {
  const requiredAddresses = [
    'OracleRouter',
    'TradingEngine',
    'LiquidityVault',
    'AssetRegistry',
    'UserRegistry',
    'MockDirham',
  ] as const;

  const missing = requiredAddresses.filter(
    (key) => !CONTRACT_ADDRESSES[key] || (CONTRACT_ADDRESSES[key] as string) === 'undefined'
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing contract addresses: ${missing.join(', ')}. Check your .env.local file.`
    );
  }
}
