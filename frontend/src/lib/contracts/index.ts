/**
 * Contract Configuration
 * Combines addresses and ABIs for easy import
 *
 * Addresses are populated from env vars at module load, then overwritten
 * from the middleware `/config` endpoint once `initContracts()` resolves.
 * Because the underlying address object is mutated in place, every read of
 * `CONTRACTS.*.address` automatically reflects the latest values.
 */

import {
  CONTRACT_ADDRESSES,
  initContractAddresses,
  validateContractAddresses,
} from './addresses';
import { ABIS } from './abis';

// ---------------------------------------------------------------------------
// Build the CONTRACTS lookup.
//
// Each `address` field is a *getter* that reads from the shared, mutable
// CONTRACT_ADDRESSES object.  This means callers can keep using
//   `CONTRACTS.TradingEngine.address`
// synchronously, and they will always see whatever value is in
// CONTRACT_ADDRESSES at read-time (env fallback initially, API value after
// initContracts).
// ---------------------------------------------------------------------------

function buildContracts() {
  return {
    OracleRouter: {
      get address() { return CONTRACT_ADDRESSES.OracleRouter; },
      abi: ABIS.OracleRouter,
    },
    TradingEngine: {
      get address() { return CONTRACT_ADDRESSES.TradingEngine; },
      abi: ABIS.TradingEngine,
    },
    Treasury: {
      get address() { return CONTRACT_ADDRESSES.LiquidityVault; },
      abi: ABIS.LiquidityVault,
    },
    AssetRegistry: {
      get address() { return CONTRACT_ADDRESSES.AssetRegistry; },
      abi: ABIS.AssetRegistry,
    },
    UserRegistry: {
      get address() { return CONTRACT_ADDRESSES.UserRegistry; },
      abi: ABIS.UserRegistry,
    },
    MockDirham: {
      get address() { return CONTRACT_ADDRESSES.MockDirham; },
      abi: ABIS.ERC20,
    },
    // Oracle Adapters
    PythAdapter: {
      get address() { return CONTRACT_ADDRESSES.PythAdapter; },
      abi: ABIS.PythAdapter,
    },
    DIAAdapter: {
      get address() { return CONTRACT_ADDRESSES.DIAAdapter; },
      abi: ABIS.DIAAdapter,
    },
    RedStoneAdapter: {
      get address() { return CONTRACT_ADDRESSES.RedStoneAdapter; },
      abi: ABIS.RedStoneAdapter,
    },
  };
}

export const CONTRACTS = buildContracts();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let _contractsInitPromise: Promise<void> | null = null;

/**
 * Fetch contract addresses from the middleware and populate CONTRACTS.
 *
 * Safe to call multiple times; the fetch only happens once.  Call this as
 * early as possible in the app lifecycle (e.g. in a top-level provider or
 * layout effect).
 */
export async function initContracts(): Promise<void> {
  if (_contractsInitPromise) return _contractsInitPromise;

  _contractsInitPromise = (async () => {
    await initContractAddresses();

    // Validate after addresses have been fetched (or fallen back to env)
    try {
      validateContractAddresses();
    } catch (error) {
      console.error('[contracts] Contract configuration error:', error);
    }
  })();

  return _contractsInitPromise;
}

// Kick off validation immediately when loaded in the browser (env fallback).
// The real init (API fetch) should be triggered by `initContracts()`.
if (typeof window !== 'undefined') {
  try {
    validateContractAddresses();
  } catch (error) {
    console.error('[contracts] Contract configuration error:', error);
  }
}

export { CONTRACT_ADDRESSES, ABIS };
export type ContractName = keyof typeof CONTRACTS;
