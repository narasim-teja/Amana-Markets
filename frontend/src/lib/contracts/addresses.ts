/**
 * Smart Contract Addresses on ADI Testnet
 *
 * Addresses are loaded from middleware API at startup, with
 * environment variables used as fallback values.
 */

import { getAddress } from 'viem';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Env-var fallback (used until the middleware /config response arrives)
// ---------------------------------------------------------------------------
const CONTRACT_ADDRESSES_FROM_ENV = {
  // Oracle Infrastructure
  OracleRouter: process.env.NEXT_PUBLIC_ORACLE_ROUTER as `0x${string}`,

  // Oracle Adapters
  PythAdapter: process.env.NEXT_PUBLIC_PYTH_ADAPTER as `0x${string}`,
  DIAAdapter: process.env.NEXT_PUBLIC_DIA_ADAPTER as `0x${string}`,
  RedStoneAdapter: process.env.NEXT_PUBLIC_REDSTONE_ADAPTER as `0x${string}`,
  ManualAdapter: (process.env.NEXT_PUBLIC_MANUAL_ADAPTER ?? undefined) as `0x${string}` | undefined,

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
};

export type ContractAddresses = typeof CONTRACT_ADDRESSES_FROM_ENV;

// ---------------------------------------------------------------------------
// Mutable module-level cache  (single object reference -- mutated in place)
// ---------------------------------------------------------------------------
const _addresses: Record<string, any> = { ...CONTRACT_ADDRESSES_FROM_ENV };
let _initPromise: Promise<void> | null = null;
let _initialized = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch contract addresses from the middleware `/config` endpoint and cache
 * them at the module level. Safe to call multiple times -- subsequent calls
 * return the same promise.
 *
 * If the API call fails the env-var fallback values remain in place.
 */
export async function initContractAddresses(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const config = await apiClient.getConfig();

      if (config.contracts) {
        const c = config.contracts;

        // Mutate in place so every reference (CONTRACT_ADDRESSES, CONTRACTS,
        // getContractAddresses()) sees the updated values immediately.
        const updates: Record<string, string | undefined> = {
          OracleRouter: c.OracleRouter ?? undefined,
          PythAdapter: c.PythAdapter ?? undefined,
          DIAAdapter: c.DIAAdapter ?? undefined,
          RedStoneAdapter: c.RedStoneAdapter ?? undefined,
          ManualAdapter: c.ManualAdapter ?? undefined,
          TradingEngine: c.TradingEngine ?? undefined,
          LiquidityVault: c.LiquidityVault ?? undefined,
          AssetRegistry: c.AssetRegistry ?? undefined,
          UserRegistry: c.UserRegistry ?? undefined,
          MockDirham: c.MockDirham ?? undefined,
          XGOLD: c.XGOLD ?? undefined,
          XSILVER: c.XSILVER ?? undefined,
          XOIL: c.XOIL ?? undefined,
        };

        // Only overwrite keys that have a non-null value from the API
        // Normalize checksums so viem doesn't reject mixed-case addresses
        for (const [key, value] of Object.entries(updates)) {
          if (value) {
            _addresses[key] = getAddress(value) as `0x${string}`;
          }
        }

        _initialized = true;
        console.log('[contracts] Addresses loaded from middleware /config');
      }
    } catch (e) {
      console.warn('[contracts] Failed to fetch config from middleware, using env fallback:', e);
    }
  })();

  return _initPromise;
}

/**
 * Returns the current contract addresses (mutable -- updated after init).
 * Before `initContractAddresses()` resolves this returns the env-var values.
 */
export function getContractAddresses(): ContractAddresses {
  return _addresses as ContractAddresses;
}

/**
 * Whether the addresses have been successfully fetched from the API.
 */
export function isContractAddressesInitialized(): boolean {
  return _initialized;
}

/**
 * Legacy named export so existing `import { CONTRACT_ADDRESSES }` keeps
 * working. This is the *same* object reference as the internal `_addresses`,
 * so all reads automatically see the latest values after init.
 *
 * NOTE: This is intentionally *not* `as const` so that it can be mutated
 * internally after the API fetch.
 */
export const CONTRACT_ADDRESSES = _addresses as ContractAddresses;

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

  const current = getContractAddresses();

  const missing = requiredAddresses.filter(
    (key) => !current[key] || (current[key] as string) === 'undefined'
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing contract addresses: ${missing.join(', ')}. ` +
        'Ensure the middleware /config endpoint is reachable or check your .env.local file.'
    );
  }
}
