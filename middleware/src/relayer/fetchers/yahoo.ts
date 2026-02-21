import { ORACLE_APIS } from '../../config/oracles';
import { ASSETS } from '../../config/assets';
import type { PriceData } from '../../lib/types';
import { parsePrice } from '../../lib/utils';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        currency: string;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

export async function fetchYahooPrices(): Promise<PriceData[]> {
  const yahooAssets = ASSETS.filter(a => a.yahooSymbol);
  if (yahooAssets.length === 0) return [];

  const results = await Promise.allSettled(
    yahooAssets.map(async (asset) => {
      const url = `${ORACLE_APIS.YAHOO_FINANCE}/${encodeURIComponent(asset.yahooSymbol!)}?range=1d&interval=1d`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Yahoo ${asset.symbol}: HTTP ${response.status}`);
      }

      const data = await response.json() as YahooChartResponse;

      if (data.chart.error || !data.chart.result?.[0]) {
        throw new Error(`Yahoo ${asset.symbol}: no data`);
      }

      let price = data.chart.result[0].meta.regularMarketPrice;

      // Apply currency divisor (USX = US cents -> USD)
      if (asset.yahooCurrencyDivisor) {
        price = price / asset.yahooCurrencyDivisor;
      }

      return {
        assetId: asset.id,
        price: parsePrice(price),
        timestamp: Math.floor(Date.now() / 1000),
        source: 'Yahoo',
        decimals: 8
      } as PriceData;
    })
  );

  const prices: PriceData[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      prices.push(result.value);
    } else {
      console.warn(`⚠️  Yahoo ${yahooAssets[index]!.symbol} failed:`, result.reason);
    }
  });

  console.log(`📊 Yahoo: ${prices.length} success out of ${yahooAssets.length} assets`);
  return prices;
}
