import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import type { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface RedStoneResponse {
  [symbol: string]: {
    value: number;
    timestamp: number; // milliseconds
  };
}

export async function fetchRedStonePrices(): Promise<PriceData[]> {
  const redstoneAssets = ASSETS.filter(a => a.redstoneSymbol);
  if (redstoneAssets.length === 0) return [];

  const symbols = redstoneAssets.map(a => a.redstoneSymbol!).join(',');
  const url = `${ORACLE_APIS.REDSTONE}?symbols=${symbols}&provider=redstone`;

  try {
    const response = await fetch(url);
    const data = await response.json() as RedStoneResponse;

    return redstoneAssets.map(asset => {
      const priceData = data[asset.redstoneSymbol!];
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
