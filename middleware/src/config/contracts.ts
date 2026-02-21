import OracleRouterAbi from './abis/OracleRouter.json';
import PythAdapterAbi from './abis/PythAdapter.json';
import DIAAdapterAbi from './abis/DIAAdapter.json';
import RedStoneAdapterAbi from './abis/RedStoneAdapter.json';
import TradingEngineAbi from './abis/TradingEngine.json';
import LiquidityVaultAbi from './abis/LiquidityVault.json';
import AssetRegistryAbi from './abis/AssetRegistry.json';
import UserRegistryAbi from './abis/UserRegistry.json';
import CommodityTokenAbi from './abis/CommodityToken.json';

export const CONTRACTS = {
  OracleRouter: {
    address: process.env.ORACLE_ROUTER as `0x${string}`,
    abi: OracleRouterAbi
  },
  PythAdapter: {
    address: process.env.PYTH_ADAPTER as `0x${string}`,
    abi: PythAdapterAbi
  },
  DIAAdapter: {
    address: process.env.DIA_ADAPTER as `0x${string}`,
    abi: DIAAdapterAbi
  },
  RedStoneAdapter: {
    address: process.env.REDSTONE_ADAPTER as `0x${string}`,
    abi: RedStoneAdapterAbi
  },
  ManualAdapter: {
    address: process.env.MANUAL_ORACLE_ADAPTER as `0x${string}`,
    abi: PythAdapterAbi // Same RelayedOracleAdapter interface (updatePrice, getPrice)
  },
  TradingEngine: {
    address: process.env.TRADING_ENGINE as `0x${string}`,
    abi: TradingEngineAbi
  },
  LiquidityVault: {
    address: process.env.LIQUIDITY_VAULT as `0x${string}`,
    abi: LiquidityVaultAbi
  },
  AssetRegistry: {
    address: process.env.ASSET_REGISTRY as `0x${string}`,
    abi: AssetRegistryAbi
  },
  UserRegistry: process.env.USER_REGISTRY ? {
    address: process.env.USER_REGISTRY as `0x${string}`,
    abi: UserRegistryAbi
  } : null,
  CommodityToken: {
    abi: CommodityTokenAbi // Address varies per asset
  }
} as const;
