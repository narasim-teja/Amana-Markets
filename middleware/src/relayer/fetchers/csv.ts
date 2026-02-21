import { ASSETS } from '../../config/assets';
import type { PriceData } from '../../lib/types';
import { parsePrice, getCurrentTimestamp } from '../../lib/utils';
import { getCSVLatestPrice } from '../../services/csvPrices';

export async function fetchCSVPrices(): Promise<PriceData[]> {
  const csvAssets = ASSETS.filter(a => a.csvFile);
  if (csvAssets.length === 0) return [];

  const prices: PriceData[] = [];
  let successCount = 0;

  for (const asset of csvAssets) {
    const usdPrice = getCSVLatestPrice(asset.symbol);
    if (usdPrice && usdPrice > 0) {
      prices.push({
        assetId: asset.id,
        price: parsePrice(usdPrice),
        timestamp: getCurrentTimestamp(),
        source: 'CSV',
        decimals: 8,
      });
      successCount++;
    } else {
      console.warn(`⚠️  CSV: No price data for ${asset.symbol}`);
    }
  }

  console.log(`📊 CSV: ${successCount} success out of ${csvAssets.length} assets`);
  return prices;
}
