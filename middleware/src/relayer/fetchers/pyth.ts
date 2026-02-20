import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import { PriceData } from '../../lib/types';
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
  const feedIds = ASSETS.map(a => a.pythFeedId).filter(Boolean);
  const url = `${ORACLE_APIS.PYTH_HERMES}?${feedIds.map(id => `ids[]=${id}`).join('&')}`;

  try {
    const response = await fetch(url);

    // Check if response is JSON
    const text = await response.text();
    if (!text.startsWith('{')) {
      console.warn('⚠️  Pyth API returned non-JSON response:', text.slice(0, 100));
      return [];
    }

    const data: PythResponse = JSON.parse(text);

    if (!data.parsed || data.parsed.length === 0) {
      return [];
    }

    return data.parsed.map(item => {
      const asset = ASSETS.find(a => a.pythFeedId === item.id);
      if (!asset) return null;

      // Pyth price is price * 10^expo, normalize to 8 decimals
      const rawPrice = parseFloat(item.price.price);
      const expo = item.price.expo;
      const normalizedPrice = rawPrice * Math.pow(10, expo + 8);

      return {
        assetId: asset.id,
        price: parsePrice(normalizedPrice, 0), // Already in base units
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
