import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface DIAResponse {
  Symbol: string;
  Price: number;
  Time: string; // ISO timestamp
}

export async function fetchDIAPrices(): Promise<PriceData[]> {
  const prices: PriceData[] = [];

  for (const asset of ASSETS) {
    if (!asset.diaSymbol) continue; // Skip oil

    try {
      const url = `${ORACLE_APIS.DIA_BASE}/${asset.diaSymbol}`;
      const response = await fetch(url);
      const data: DIAResponse = await response.json();

      // Apply unit conversion (Silver: gram → troy ounce)
      const adjustedPrice = data.Price * asset.unitConversion;

      prices.push({
        assetId: asset.id,
        price: parsePrice(adjustedPrice),
        timestamp: Math.floor(new Date(data.Time).getTime() / 1000),
        source: 'DIA',
        decimals: 8
      });
    } catch (error) {
      console.error(`❌ DIA fetch failed for ${asset.symbol}:`, error);
    }
  }

  return prices;
}
