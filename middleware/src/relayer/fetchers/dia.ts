import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import type { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface DIAResponse {
  Ticker: string;
  Name?: string;
  Price: number;
  Timestamp: string;
}

const CONCURRENCY = 10; // Parallel requests
const PER_REQUEST_TIMEOUT = 5000; // 5s per request (matches Yahoo)

export async function fetchDIAPrices(): Promise<PriceData[]> {
  const diaAssets = ASSETS.filter(a => a.diaCategory && a.diaTicker);
  if (diaAssets.length === 0) return [];

  const prices: PriceData[] = [];
  let successCount = 0;
  let failCount = 0;

  // Process in parallel batches
  for (let i = 0; i < diaAssets.length; i += CONCURRENCY) {
    const batch = diaAssets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (asset) => {
        const url = `${ORACLE_APIS.DIA_RWA}/${asset.diaCategory}/${asset.diaTicker}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json() as DIAResponse;

        if (!data.Price || data.Price <= 0) {
          throw new Error('No price');
        }

        return {
          assetId: asset.id,
          price: parsePrice(data.Price),
          timestamp: Math.floor(new Date(data.Timestamp).getTime() / 1000),
          source: 'DIA' as const,
          decimals: 8
        } as PriceData;
      })
    );

    results.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        prices.push(result.value);
        successCount++;
      } else {
        failCount++;
        const failed = batch[j];
        console.warn(
          `⚠️  DIA ${failed?.symbol} (${failed?.diaCategory}/${failed?.diaTicker}) failed:`,
          result.reason?.message || result.reason
        );
      }
    });
  }

  console.log(`📊 DIA: ${successCount} success, ${failCount} failed out of ${diaAssets.length} assets`);
  return prices;
}
