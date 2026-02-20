import { keccak256, toHex } from 'viem';

/**
 * Asset IDs - Generated using keccak256 (matches middleware and contracts)
 * These are the unique identifiers used throughout the system
 */
export const ASSET_IDS = {
  GOLD: keccak256(toHex('XAU/USD')),
  SILVER: keccak256(toHex('XAG/USD')),
  OIL: keccak256(toHex('WTI/USD')),
} as const;

/**
 * API Asset Response
 * Raw asset data from the /assets API endpoint
 */
export interface ApiAsset {
  asset_id: string;
  symbol?: string;
  name?: string;
  token_address?: `0x${string}`;
  status?: string;
  spread?: number;
  exposure?: string;
  max_exposure?: string;
  volume_24h?: string;
}

/**
 * Asset Metadata Interface
 * Combines on-chain data with UI-specific metadata (icons, colors, etc.)
 */
export interface AssetMetadata {
  assetId: string;
  symbol: string; // Oracle symbol (XAU, XAG, WTI)
  name: string; // Human-readable name
  tokenSymbol: string; // Token symbol (xGOLD, xSILVER, xOIL)
  icon: string; // Path to icon SVG
  color: string; // Accent color for UI
  description: string; // Short description
  decimals: number; // Token decimals (always 18 for commodities)
  tokenAddress?: `0x${string}`; // ERC20 token address (loaded from API)

  // API-provided properties
  status?: string; // Asset status (active, paused, etc.)
  spread?: number; // Trading spread percentage
  exposure?: string; // Current vault exposure
  maxExposure?: string; // Maximum allowed exposure
  volume24h?: string; // 24-hour trading volume
}

/**
 * Static metadata for known assets
 * This can be easily extended when new commodities are added
 */
export const ASSET_METADATA: Record<string, AssetMetadata> = {
  [ASSET_IDS.GOLD]: {
    assetId: ASSET_IDS.GOLD,
    symbol: 'XAU',
    name: 'Gold',
    tokenSymbol: 'xGOLD',
    icon: '/commodities/gold.svg',
    color: '#C9A96E', // Gold color matching brand
    description: 'Precious metal - Troy ounce',
    decimals: 18,
    tokenAddress: process.env.NEXT_PUBLIC_XGOLD as `0x${string}`,
  },
  [ASSET_IDS.SILVER]: {
    assetId: ASSET_IDS.SILVER,
    symbol: 'XAG',
    name: 'Silver',
    tokenSymbol: 'xSILVER',
    icon: '/commodities/silver.svg',
    color: '#C0C0C0', // Silver color
    description: 'Precious metal - Troy ounce',
    decimals: 18,
    tokenAddress: process.env.NEXT_PUBLIC_XSILVER as `0x${string}`,
  },
  [ASSET_IDS.OIL]: {
    assetId: ASSET_IDS.OIL,
    symbol: 'WTI',
    name: 'Crude Oil (WTI)',
    tokenSymbol: 'xOIL',
    icon: '/commodities/oil.svg',
    color: '#1A1A1A', // Dark for oil
    description: 'West Texas Intermediate - Barrel',
    decimals: 18,
    tokenAddress: process.env.NEXT_PUBLIC_XOIL as `0x${string}`,
  },
};

/**
 * Get asset metadata by ID
 */
export function getAssetMetadata(assetId: string): AssetMetadata | undefined {
  return ASSET_METADATA[assetId];
}

/**
 * Get all asset metadata
 */
export function getAllAssetMetadata(): AssetMetadata[] {
  return Object.values(ASSET_METADATA);
}

/**
 * Enrich API asset data with local metadata
 * Merges on-chain/API data with UI-specific metadata
 *
 * @param apiAsset - Asset data from /assets API endpoint
 * @returns Complete AssetMetadata with both API and local data
 */
export function enrichAssetWithMetadata(apiAsset: ApiAsset): AssetMetadata {
  const metadata = ASSET_METADATA[apiAsset.asset_id];

  if (!metadata) {
    // Fallback for unknown assets (future commodities)
    console.warn(`No metadata found for asset ${apiAsset.asset_id}, using defaults`);
    return {
      assetId: apiAsset.asset_id,
      symbol: apiAsset.symbol || 'UNKNOWN',
      name: apiAsset.name || 'Unknown Asset',
      tokenSymbol: apiAsset.symbol ? `x${apiAsset.symbol}` : 'xUNKNOWN',
      icon: '/commodities/default.svg',
      color: '#888888',
      description: apiAsset.name || '',
      decimals: 18,
      tokenAddress: apiAsset.token_address,
    };
  }

  // Merge API data with local metadata
  return {
    ...metadata,
    tokenAddress: apiAsset.token_address || metadata.tokenAddress,
    // API can override certain fields if needed
    name: apiAsset.name || metadata.name,
    symbol: apiAsset.symbol || metadata.symbol,
  };
}

/**
 * Get asset color by ID
 */
export function getAssetColor(assetId: string): string {
  return ASSET_METADATA[assetId]?.color || '#888888';
}

/**
 * Get asset icon path by ID
 */
export function getAssetIcon(assetId: string): string {
  return ASSET_METADATA[assetId]?.icon || '/commodities/default.svg';
}
