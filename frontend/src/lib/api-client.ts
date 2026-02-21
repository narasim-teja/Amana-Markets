/**
 * API Client for Middleware REST API
 * Provides typed methods for all middleware endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Handle API response with error checking
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.error || `API Error: ${response.status} ${response.statusText}`,
      response.status,
      errorData
    );
  }
  return response.json();
}

/**
 * API Client Methods
 */
export const apiClient = {
  // ==================== CONFIG ====================

  /**
   * Get contract addresses and chain configuration from middleware
   */
  async getConfig() {
    const response = await fetch(`${API_BASE_URL}/config`);
    return handleResponse<{
      contracts: Record<string, string | null>;
      chain: { id: number; name: string; rpcUrl: string; blockExplorer: string | null };
    }>(response);
  },

  // ==================== ASSETS ====================

  /**
   * Get all registered assets
   */
  async getAssets() {
    const response = await fetch(`${API_BASE_URL}/assets`);
    return handleResponse<{ assets: any[] }>(response);
  },

  /**
   * Get specific asset by ID
   */
  async getAsset(assetId: string) {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}`);
    return handleResponse<{ asset: any }>(response);
  },

  // ==================== PRICES ====================

  /**
   * Get live prices from oracle APIs (real-time display)
   */
  async getLivePrices() {
    const response = await fetch(`${API_BASE_URL}/prices/live`);
    return handleResponse<{ prices: any[]; disclaimer: string; timestamp: number }>(response);
  },

  /**
   * Get live price for specific asset
   */
  async getLivePrice(assetId: string) {
    const response = await fetch(`${API_BASE_URL}/prices/live/${assetId}`);
    return handleResponse<{ price: any; timestamp: number }>(response);
  },

  /**
   * Compare display price vs on-chain execution price
   */
  async comparePrice(assetId: string) {
    const response = await fetch(`${API_BASE_URL}/prices/live/compare/${assetId}`);
    return handleResponse<{
      live: any;
      onChain: any;
      spread: string;
      spreadBps: number;
    }>(response);
  },

  /**
   * Get median price from on-chain oracle
   */
  async getMedianPrice(assetId: string) {
    const response = await fetch(`${API_BASE_URL}/prices/median/${assetId}`);
    return handleResponse<{ medianPrice: string; sourceCount: number }>(response);
  },

  /**
   * Get price history for asset
   */
  async getPriceHistory(assetId: string) {
    const response = await fetch(`${API_BASE_URL}/prices/${assetId}`);
    return handleResponse<{ prices: any[] }>(response);
  },

  /**
   * Get historical price data for charts (time-bucketed averages)
   */
  async getPriceChartData(assetId: string, range: '1h' | '24h' | '7d' | '30d' = '24h') {
    const response = await fetch(`${API_BASE_URL}/prices/${assetId}/history?range=${range}`);
    return handleResponse<{
      assetId: string;
      range: string;
      interval: string;
      source: string;
      prices: Array<{ time: number; price: number }>;
    }>(response);
  },

  // ==================== TRADES ====================

  /**
   * Get paginated trade history with optional filters
   */
  async getTrades(params?: { limit?: number; offset?: number; assetId?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.assetId) query.set('assetId', params.assetId);

    const response = await fetch(`${API_BASE_URL}/trades?${query}`);
    return handleResponse<{ trades: any[]; limit: number; offset: number }>(response);
  },

  /**
   * Get trades for specific user address
   */
  async getUserTrades(address: string, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/trades/${address}?limit=${limit}`);
    return handleResponse<{ address: string; trades: any[] }>(response);
  },

  // ==================== TREASURY ====================

  /**
   * Get treasury statistics (total reserves, utilization, etc.)
   */
  async getTreasuryStats() {
    const response = await fetch(`${API_BASE_URL}/treasury/stats`);
    return handleResponse<{
      totalAssets: string;
      utilization: number;
      availableLiquidity: string;
    }>(response);
  },

  /**
   * Get treasury exposure breakdown by asset
   */
  async getTreasuryExposure() {
    const response = await fetch(`${API_BASE_URL}/treasury/exposure`);
    return handleResponse<{ assetExposures: any[]; totalExposure: string }>(response);
  },

  /**
   * Get deposit/withdrawal history
   */
  async getTreasuryDeposits(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/treasury/deposits?${query}`);
    return handleResponse<{ deposits: any[] }>(response);
  },

  // ==================== USERS ====================

  /**
   * Get all known users from indexed events
   */
  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`);
    return handleResponse<{
      users: { address: string; action: string; last_updated: number }[];
    }>(response);
  },

  /**
   * Check if address is whitelisted
   */
  async getUserWhitelistStatus(address: string) {
    const response = await fetch(`${API_BASE_URL}/users/${address}/whitelist`);
    return handleResponse<{
      address: string;
      isWhitelisted: boolean;
      history: any[];
    }>(response);
  },

  // ==================== ANALYTICS ====================

  /**
   * Get volume analytics for time period
   */
  async getVolumeAnalytics(period: '24h' | '7d' | '30d' = '24h') {
    const response = await fetch(`${API_BASE_URL}/analytics/volume?period=${period}`);
    return handleResponse<{
      period: string;
      volumeByAsset: any[];
    }>(response);
  },

  /**
   * Get fee collection analytics
   */
  async getFeeAnalytics() {
    const response = await fetch(`${API_BASE_URL}/analytics/fees`);
    return handleResponse<{
      totalFees: string;
      feesByAsset: any[];
    }>(response);
  },

  /**
   * Get trader statistics
   */
  async getTraderAnalytics() {
    const response = await fetch(`${API_BASE_URL}/analytics/traders`);
    return handleResponse<{
      stats: { unique_traders: number; total_trades: number };
      topTraders: any[];
    }>(response);
  },

  // ==================== HEALTH ====================

  /**
   * Health check for middleware services
   */
  async getHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{
      status: string;
      timestamp: number;
      blockchain: any;
      indexer: any;
      database: any;
    }>(response);
  },
};

/**
 * Utility function to build query string
 */
export function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  return query.toString();
}
