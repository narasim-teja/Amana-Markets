/**
 * Contract Configuration
 * Combines addresses and ABIs for easy import
 */

import { CONTRACT_ADDRESSES, validateContractAddresses } from './addresses';
import { ABIS } from './abis';

/**
 * Complete contract configuration with addresses and ABIs
 */
export const CONTRACTS = {
  OracleRouter: {
    address: CONTRACT_ADDRESSES.OracleRouter,
    abi: ABIS.OracleRouter,
  },
  TradingEngine: {
    address: CONTRACT_ADDRESSES.TradingEngine,
    abi: ABIS.TradingEngine,
  },
  LiquidityVault: {
    address: CONTRACT_ADDRESSES.LiquidityVault,
    abi: ABIS.LiquidityVault,
  },
  AssetRegistry: {
    address: CONTRACT_ADDRESSES.AssetRegistry,
    abi: ABIS.AssetRegistry,
  },
  UserRegistry: {
    address: CONTRACT_ADDRESSES.UserRegistry,
    abi: ABIS.UserRegistry,
  },
  MockDirham: {
    address: CONTRACT_ADDRESSES.MockDirham,
    abi: ABIS.ERC20,
  },
  // Oracle Adapters
  PythAdapter: {
    address: CONTRACT_ADDRESSES.PythAdapter,
    abi: ABIS.PythAdapter,
  },
  DIAAdapter: {
    address: CONTRACT_ADDRESSES.DIAAdapter,
    abi: ABIS.DIAAdapter,
  },
  RedStoneAdapter: {
    address: CONTRACT_ADDRESSES.RedStoneAdapter,
    abi: ABIS.RedStoneAdapter,
  },
} as const;

// Validate addresses on import (only in browser)
if (typeof window !== 'undefined') {
  try {
    validateContractAddresses();
  } catch (error) {
    console.error('Contract configuration error:', error);
  }
}

export { CONTRACT_ADDRESSES, ABIS };
export type ContractName = keyof typeof CONTRACTS;
