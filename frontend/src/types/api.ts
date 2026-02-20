/**
 * API Response Types
 * Common interfaces matching actual middleware API responses
 */

// ==================== TRADES ====================

/**
 * Trade record from /trades API
 * Matches the trades table in middleware SQLite DB
 */
export interface Trade {
  id: string;
  block_number: number;
  timestamp: number;
  trader: string;
  asset_id: string;
  is_buy: number; // SQLite returns 0 or 1
  stablecoin_amount: string; // Raw BigInt as string (6 decimals)
  token_amount: string; // Raw BigInt as string (8 decimals)
  oracle_price: string;
  effective_price: string;
  spread_bps: string;
  fee: string;
  tx_hash: string;
}

// ==================== PRICES ====================

/**
 * Individual oracle source price data
 * Returned within LivePriceData.sources
 */
export interface SourcePrice {
  price: string;
  timestamp: number;
  status: 'ok' | 'stale' | 'error';
}

/**
 * Live price data from /prices/live API
 * Matches LivePriceData from middleware services/livePrices.ts
 */
export interface LivePriceData {
  assetId: string;
  symbol: string;
  name: string;
  displayPrice: string;
  displayPriceRaw: string;
  sources: {
    dia?: SourcePrice;
    pyth?: SourcePrice;
    redstone?: SourcePrice;
  };
  median: string;
  lastUpdated: number;
  cacheStatus: 'fresh' | 'stale';
}

// ==================== ANALYTICS ====================

/**
 * Volume data per asset from /analytics/volume
 */
export interface VolumeByAsset {
  asset_id: string;
  trade_count: number;
  total_volume: string;
  buy_count: number;
  sell_count: number;
}

/**
 * Volume analytics response from /analytics/volume
 */
export interface VolumeData {
  period: string;
  volumeByAsset: VolumeByAsset[];
}

/**
 * Fee analytics response from /analytics/fees
 */
export interface FeesData {
  totalFees: string;
  feesByAsset: Array<{
    asset_id: string;
    total_fees: string;
  }>;
}

/**
 * Trader analytics response from /analytics/traders
 */
export interface TraderData {
  stats: {
    unique_traders: number;
    total_trades: number;
  };
  topTraders: Array<{
    trader: string;
    trade_count: number;
    total_volume: string;
  }>;
}
