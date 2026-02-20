import { fetchPythPrices } from '../relayer/fetchers/pyth';
import { fetchDIAPrices } from '../relayer/fetchers/dia';
import { fetchRedStonePrices } from '../relayer/fetchers/redstone';
import { ASSETS, getAssetById } from '../config/assets';
import { PriceData } from '../lib/types';
import { formatPrice } from '../lib/utils';

interface SourcePrice {
  price: string;
  timestamp: number;
  status: 'ok' | 'stale' | 'error';
}

export interface LivePriceData {
  assetId: string;
  symbol: string;
  name: string;
  displayPrice: string;
  displayPriceRaw: string; // BigInt as string for JSON serialization
  sources: {
    pyth?: SourcePrice;
    dia?: SourcePrice;
    redstone?: SourcePrice;
  };
  median: string;
  lastUpdated: number;
  cacheStatus: 'fresh' | 'stale';
}

interface PriceCache {
  data: Map<string, PriceData[]>;
  lastFetch: number;
}

const cache: PriceCache = {
  data: new Map(),
  lastFetch: 0
};

const CACHE_TTL = parseInt(process.env.LIVE_PRICE_CACHE_TTL || '60000'); // 60 seconds
const PRICE_STALENESS_THRESHOLD = 86400; // 24 hours (matches on-chain staleness)

function isPriceStale(timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - timestamp) > PRICE_STALENESS_THRESHOLD;
}

function calculateMedian(prices: bigint[]): bigint {
  if (prices.length === 0) return 0n;
  if (prices.length === 1) return prices[0];

  const sorted = [...prices].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2n;
  }
  return sorted[mid];
}

function groupPricesByAsset(allPrices: PriceData[]): Map<string, PriceData[]> {
  const grouped = new Map<string, PriceData[]>();

  for (const price of allPrices) {
    const existing = grouped.get(price.assetId) || [];
    existing.push(price);
    grouped.set(price.assetId, existing);
  }

  return grouped;
}

function formatLivePrices(priceMap: Map<string, PriceData[]>, filterAssetId?: string): LivePriceData[] {
  const result: LivePriceData[] = [];

  for (const asset of ASSETS) {
    // Filter by asset if requested
    if (filterAssetId && asset.id !== filterAssetId) {
      continue;
    }

    const assetPrices = priceMap.get(asset.id) || [];

    // Build sources object
    const sources: LivePriceData['sources'] = {};
    const validPrices: bigint[] = [];

    for (const priceData of assetPrices) {
      const sourceKey = priceData.source.toLowerCase() as 'pyth' | 'dia' | 'redstone';
      const isStale = isPriceStale(priceData.timestamp);

      sources[sourceKey] = {
        price: formatPrice(priceData.price),
        timestamp: priceData.timestamp,
        status: isStale ? 'stale' : 'ok'
      };

      // Only include non-stale prices in median calculation
      if (!isStale) {
        validPrices.push(priceData.price);
      }
    }

    // Calculate median from valid prices
    const medianPrice = calculateMedian(validPrices);
    const displayPriceRaw = medianPrice > 0n ? medianPrice : (assetPrices[0]?.price || 0n);

    result.push({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      displayPrice: formatPrice(displayPriceRaw),
      displayPriceRaw: displayPriceRaw.toString(), // Convert BigInt to string for JSON
      sources,
      median: formatPrice(medianPrice),
      lastUpdated: Math.max(...assetPrices.map(p => p.timestamp), 0),
      cacheStatus: (Date.now() - cache.lastFetch) < CACHE_TTL ? 'fresh' : 'stale'
    });
  }

  return result;
}

export async function getLivePrices(assetId?: string): Promise<LivePriceData[]> {
  const now = Date.now();

  // Return cached data if fresh
  if (cache.data.size > 0 && (now - cache.lastFetch) < CACHE_TTL) {
    return formatLivePrices(cache.data, assetId);
  }

  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchPythPrices(),
    fetchDIAPrices(),
    fetchRedStonePrices()
  ]);

  // Merge successful results (ignore failures)
  const allPrices: PriceData[] = [];

  results.forEach((result, index) => {
    const sourceName = ['Pyth', 'DIA', 'RedStone'][index];
    if (result.status === 'fulfilled') {
      allPrices.push(...result.value);
    } else {
      console.warn(`⚠️  ${sourceName} fetch failed:`, result.reason);
    }
  });

  // Update cache even if empty (to avoid hammering APIs)
  cache.data = groupPricesByAsset(allPrices);
  cache.lastFetch = now;

  // If all fetches failed and cache is empty, return empty with stale status
  if (allPrices.length === 0 && cache.data.size === 0) {
    console.error('❌ All oracle sources failed and cache is empty');
    // Return empty data with stale status for each asset
    return ASSETS.map(asset => ({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      displayPrice: '0.00',
      displayPriceRaw: 0n,
      sources: {},
      median: '0.00',
      lastUpdated: 0,
      cacheStatus: 'stale' as const
    }));
  }

  return formatLivePrices(cache.data, assetId);
}

export async function refreshCache(): Promise<void> {
  cache.lastFetch = 0; // Force refresh
  await getLivePrices();
}

export interface SourceHealthStatus {
  pyth: { isHealthy: boolean; lastSuccessTimestamp: number };
  dia: { isHealthy: boolean; lastSuccessTimestamp: number };
  redstone: { isHealthy: boolean; lastSuccessTimestamp: number };
  healthyCount: number;
}

export async function getSourceStatuses(): Promise<SourceHealthStatus> {
  const results = await Promise.allSettled([
    fetchPythPrices(),
    fetchDIAPrices(),
    fetchRedStonePrices()
  ]);

  const statuses = {
    pyth: { isHealthy: results[0].status === 'fulfilled' && results[0].value.length > 0, lastSuccessTimestamp: 0 },
    dia: { isHealthy: results[1].status === 'fulfilled' && results[1].value.length > 0, lastSuccessTimestamp: 0 },
    redstone: { isHealthy: results[2].status === 'fulfilled' && results[2].value.length > 0, lastSuccessTimestamp: 0 },
    healthyCount: 0
  };

  // Update timestamps from cache
  const now = Math.floor(Date.now() / 1000);
  for (const prices of cache.data.values()) {
    for (const price of prices) {
      const key = price.source.toLowerCase() as 'pyth' | 'dia' | 'redstone';
      if (statuses[key] && price.timestamp > statuses[key].lastSuccessTimestamp) {
        statuses[key].lastSuccessTimestamp = price.timestamp;
      }
    }
  }

  statuses.healthyCount = [statuses.pyth, statuses.dia, statuses.redstone]
    .filter(s => s.isHealthy).length;

  return statuses;
}
