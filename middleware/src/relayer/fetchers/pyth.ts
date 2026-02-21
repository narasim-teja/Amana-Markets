import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import type { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface PythResponse {
  parsed: Array<{
    id: string;
    price: {
      price: string;
      expo: number;
      publish_time: number;
    };
  }>;
}

export async function fetchPythPrices(): Promise<PriceData[]> {
  const pythAssets = ASSETS.filter(a => a.pythFeedId);
  if (pythAssets.length === 0) return [];

  const feedIds = pythAssets.map(a => a.pythFeedId!);
  const url = `${ORACLE_APIS.PYTH_HERMES}?${feedIds.map(id => `ids[]=${id}`).join('&')}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await response.text();

    if (!text.startsWith('{') && !text.startsWith('[')) {
      console.warn('⚠️  Pyth API returned non-JSON response:', text.slice(0, 100));
      return [];
    }

    const data: PythResponse = JSON.parse(text);

    if (!data.parsed || data.parsed.length === 0) {
      return [];
    }

    return data.parsed.map(item => {
      // Normalize both sides: strip 0x prefix for comparison
      const itemId = item.id.replace(/^0x/, '').toLowerCase();
      const asset = pythAssets.find(a => a.pythFeedId!.replace(/^0x/, '').toLowerCase() === itemId);
      if (!asset) return null;

      // Pyth price is price * 10^expo, normalize to 8 decimals
      const rawPrice = parseFloat(item.price.price);
      const expo = item.price.expo;
      const normalizedPrice = rawPrice * Math.pow(10, expo + 8);

      return {
        assetId: asset.id,
        price: parsePrice(normalizedPrice, 0),
        timestamp: item.price.publish_time,
        source: 'Pyth',
        decimals: 8
      };
    }).filter(Boolean) as PriceData[];
  } catch (error) {
    console.error('❌ Pyth fetch failed:', error);
    return [];
  }
}
