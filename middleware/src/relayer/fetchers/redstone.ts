import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface RedStoneResponse {
  [symbol: string]: Array<{
    value: number;
    timestamp: number; // milliseconds
  }>;
}

export async function fetchRedStonePrices(): Promise<PriceData[]> {
  const symbols = ASSETS.map(a => a.redstoneSymbol).join(',');
  const url = `${ORACLE_APIS.REDSTONE}?symbols=${symbols}&provider=redstone`;

  try {
    const response = await fetch(url);
    const data: RedStoneResponse = await response.json();

    return ASSETS.map(asset => {
      const priceData = data[asset.redstoneSymbol]?.[0];
      if (!priceData) return null;

      return {
        assetId: asset.id,
        price: parsePrice(priceData.value),
        timestamp: Math.floor(priceData.timestamp / 1000),
        source: 'RedStone',
        decimals: 8
      };
    }).filter(Boolean) as PriceData[];
  } catch (error) {
    console.error('❌ RedStone fetch failed:', error);
    return [];
  }
}
