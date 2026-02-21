import { fetchPythPrices } from '../relayer/fetchers/pyth';
import { fetchDIAPrices } from '../relayer/fetchers/dia';
import { fetchRedStonePrices } from '../relayer/fetchers/redstone';
import { fetchYahooPrices } from '../relayer/fetchers/yahoo';
import { fetchCSVPrices } from '../relayer/fetchers/csv';
import { ASSETS } from '../config/assets';
import type { AssetCategory } from '../config/assets';
import type { PriceData } from '../lib/types';
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
  category: string;
  displayPrice: string;
  displayPriceRaw: string;
  sources: {
    pyth?: SourcePrice;
    dia?: SourcePrice;
    redstone?: SourcePrice;
    yahoo?: SourcePrice;
    csv?: SourcePrice;
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

const CACHE_TTL = parseInt(process.env.LIVE_PRICE_CACHE_TTL || '60000');
const PRICE_STALENESS_THRESHOLD = 7200; // 2 hours (matches on-chain staleness)

function isPriceStale(timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - timestamp) > PRICE_STALENESS_THRESHOLD;
}

function calculateMedian(prices: bigint[]): bigint {
  if (prices.length === 0) return 0n;
  if (prices.length === 1) return prices[0]!;

  const sorted = [...prices].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2n;
  }
  return sorted[mid]!;
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

function formatLivePrices(
  priceMap: Map<string, PriceData[]>,
  filterAssetId?: string,
  filterCategory?: AssetCategory
): LivePriceData[] {
  const result: LivePriceData[] = [];

  for (const asset of ASSETS) {
    if (filterAssetId && asset.id !== filterAssetId) continue;
    if (filterCategory && asset.category !== filterCategory) continue;

    const assetPrices = priceMap.get(asset.id) || [];

    const sources: LivePriceData['sources'] = {};
    const validPrices: bigint[] = [];

    for (const priceData of assetPrices) {
      const sourceKey = priceData.source.toLowerCase() as 'pyth' | 'dia' | 'redstone' | 'yahoo' | 'csv';
      const isStale = isPriceStale(priceData.timestamp);

      sources[sourceKey] = {
        price: formatPrice(priceData.price),
        timestamp: priceData.timestamp,
        status: isStale ? 'stale' : 'ok'
      };

      if (!isStale) {
        validPrices.push(priceData.price);
      }
    }

    const medianPrice = calculateMedian(validPrices);
    const displayPriceRaw = medianPrice > 0n ? medianPrice : (assetPrices[0]?.price || 0n);

    result.push({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      displayPrice: formatPrice(displayPriceRaw),
      displayPriceRaw: displayPriceRaw.toString(),
      sources,
      median: formatPrice(medianPrice),
      lastUpdated: Math.max(...assetPrices.map(p => p.timestamp), 0),
      cacheStatus: (Date.now() - cache.lastFetch) < CACHE_TTL ? 'fresh' : 'stale'
    });
  }

  return result;
}

export async function getLivePrices(
  assetId?: string,
  category?: AssetCategory
): Promise<LivePriceData[]> {
  const now = Date.now();

  if (cache.data.size > 0 && (now - cache.lastFetch) < CACHE_TTL) {
    return formatLivePrices(cache.data, assetId, category);
  }

  // Wrap each fetcher with its own 8s timeout so one slow source can't block the rest
  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

  const results = await Promise.allSettled([
    withTimeout(fetchPythPrices(), 8000),
    withTimeout(fetchDIAPrices(), 8000),
    withTimeout(fetchRedStonePrices(), 8000),
    withTimeout(fetchYahooPrices(), 8000),
    withTimeout(fetchCSVPrices(), 8000),
  ]);

  const allPrices: PriceData[] = [];

  results.forEach((result, index) => {
    const sourceName = ['Pyth', 'DIA', 'RedStone', 'Yahoo', 'CSV'][index];
    if (result.status === 'fulfilled') {
      allPrices.push(...result.value);
    } else {
      console.warn(`⚠️  ${sourceName} fetch failed:`, result.reason);
    }
  });

  cache.data = groupPricesByAsset(allPrices);
  cache.lastFetch = now;

  if (allPrices.length === 0 && cache.data.size === 0) {
    console.error('❌ All oracle sources failed and cache is empty');
    return ASSETS
      .filter(a => !category || a.category === category)
      .map(asset => ({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        displayPrice: '0.00',
        displayPriceRaw: '0',
        sources: {},
        median: '0.00',
        lastUpdated: 0,
        cacheStatus: 'stale' as const
      }));
  }

  return formatLivePrices(cache.data, assetId, category);
}

export async function refreshCache(): Promise<void> {
  cache.lastFetch = 0;
  await getLivePrices();
}

export interface SourceHealthStatus {
  pyth: { isHealthy: boolean; lastSuccessTimestamp: number };
  dia: { isHealthy: boolean; lastSuccessTimestamp: number };
  redstone: { isHealthy: boolean; lastSuccessTimestamp: number };
  yahoo: { isHealthy: boolean; lastSuccessTimestamp: number };
  csv: { isHealthy: boolean; lastSuccessTimestamp: number };
  healthyCount: number;
}

export async function getSourceStatuses(): Promise<SourceHealthStatus> {
  const results = await Promise.allSettled([
    fetchPythPrices(),
    fetchDIAPrices(),
    fetchRedStonePrices(),
    fetchYahooPrices(),
    fetchCSVPrices()
  ]);

  const statuses: SourceHealthStatus = {
    pyth: { isHealthy: results[0].status === 'fulfilled' && results[0].value.length > 0, lastSuccessTimestamp: 0 },
    dia: { isHealthy: results[1].status === 'fulfilled' && results[1].value.length > 0, lastSuccessTimestamp: 0 },
    redstone: { isHealthy: results[2].status === 'fulfilled' && results[2].value.length > 0, lastSuccessTimestamp: 0 },
    yahoo: { isHealthy: results[3].status === 'fulfilled' && results[3].value.length > 0, lastSuccessTimestamp: 0 },
    csv: { isHealthy: results[4].status === 'fulfilled' && results[4].value.length > 0, lastSuccessTimestamp: 0 },
    healthyCount: 0
  };

  for (const prices of cache.data.values()) {
    for (const price of prices) {
      const key = price.source.toLowerCase() as 'pyth' | 'dia' | 'redstone' | 'yahoo' | 'csv';
      if (statuses[key] && price.timestamp > statuses[key].lastSuccessTimestamp) {
        statuses[key].lastSuccessTimestamp = price.timestamp;
      }
    }
  }

  statuses.healthyCount = [statuses.pyth, statuses.dia, statuses.redstone, statuses.yahoo, statuses.csv]
    .filter(s => s.isHealthy).length;

  return statuses;
}
