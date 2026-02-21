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

const FETCH_DELAY_MS = 100; // 100ms between requests to avoid rate limiting

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchDIAPrices(): Promise<PriceData[]> {
  const diaAssets = ASSETS.filter(a => a.diaCategory && a.diaTicker);
  if (diaAssets.length === 0) return [];

  const prices: PriceData[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const asset of diaAssets) {
    try {
      const url = `${ORACLE_APIS.DIA_RWA}/${asset.diaCategory}/${asset.diaTicker}`;
      const response = await fetch(url);

      if (!response.ok) {
        failCount++;
        if (response.status !== 404) {
          console.warn(`⚠️  DIA ${asset.symbol}: HTTP ${response.status}`);
        }
        continue;
      }

      const data = await response.json() as DIAResponse;

      if (!data.Price || data.Price <= 0) {
        continue;
      }

      prices.push({
        assetId: asset.id,
        price: parsePrice(data.Price),
        timestamp: Math.floor(new Date(data.Timestamp).getTime() / 1000),
        source: 'DIA',
        decimals: 8
      });
      successCount++;
    } catch (error) {
      failCount++;
    }

    // Small delay between requests
    await sleep(FETCH_DELAY_MS);
  }

  console.log(`📊 DIA: ${successCount} success, ${failCount} failed out of ${diaAssets.length} assets`);
  return prices;
}
