import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { getLivePrices } from '../../services/livePrices';
import { formatPrice } from '../../lib/utils';
import { getAssetById } from '../../config/assets';
import type { AssetCategory } from '../../config/assets';
import { ORACLE_APIS } from '../../config/oracles';
import { getCSVHistory } from '../../services/csvPrices';

const app = new Hono();

// GET /prices - All latest prices from all sources
app.get('/', async (c) => {
  const prices = db.query(`
    SELECT asset_id, source, price, timestamp
    FROM prices p1
    WHERE timestamp = (
      SELECT MAX(timestamp)
      FROM prices p2
      WHERE p2.asset_id = p1.asset_id AND p2.source = p1.source
    )
    ORDER BY asset_id, source
  `).all();

  return c.json({ prices });
});

// GET /prices/live/compare/:assetId - Compare display vs execution price (most specific first)
app.get('/live/compare/:assetId', async (c) => {
  try {
    const assetId = c.req.param('assetId') as `0x${string}`;

    // Fetch live display price
    const livePrices = await getLivePrices(assetId);

    if (livePrices.length === 0) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    const livePrice = livePrices[0]!;

    // Fetch on-chain execution price
    const result = await publicClient.readContract({
      address: CONTRACTS.OracleRouter.address,
      abi: CONTRACTS.OracleRouter.abi,
      functionName: 'getMedianPrice',
      args: [assetId]
    }) as [bigint, bigint];

    const [onChainPrice, sourceCount] = result;

    // Calculate spread in basis points
    const livePriceRaw = BigInt(livePrice.displayPriceRaw);
    const spreadBps = livePriceRaw > 0n
      ? Number(((onChainPrice - livePriceRaw) * 10000n) / livePriceRaw)
      : 0;

    return c.json({
      live: {
        displayPrice: livePrice.displayPrice,
        sources: livePrice.sources,
        median: livePrice.median,
        lastUpdated: livePrice.lastUpdated
      },
      onChain: {
        price: formatPrice(onChainPrice),
        priceRaw: onChainPrice.toString(),
        sourceCount: Number(sourceCount),
        type: 'execution'
      },
      spread: `${(spreadBps / 100).toFixed(2)}%`,
      spreadBps,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Error comparing prices:', error);
    return c.json({ error: 'Failed to compare prices' }, 500);
  }
});

// GET /prices/live/:assetId - Single asset real-time price
app.get('/live/:assetId', async (c) => {
  try {
    const assetId = c.req.param('assetId');
    const livePrices = await getLivePrices(assetId);

    if (livePrices.length === 0) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    return c.json({
      price: livePrices[0],
      disclaimer: 'Display price only. Execution uses on-chain verified price.',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Error fetching live price:', error);
    return c.json({ error: 'Failed to fetch live price' }, 500);
  }
});

// GET /prices/live - All assets, real-time from oracle APIs (supports ?category= filter)
app.get('/live', async (c) => {
  try {
    const category = c.req.query('category') as AssetCategory | undefined;
    const livePrices = await getLivePrices(undefined, category);

    return c.json({
      prices: livePrices,
      count: livePrices.length,
      disclaimer: 'Display prices only. Execution uses on-chain verified prices.',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Error fetching live prices:', error);
    return c.json(
      {
        error: 'Failed to fetch live prices',
        prices: [],
        timestamp: Date.now()
      },
      500
    );
  }
});

// GET /prices/median/:assetId - Get median price from OracleRouter
app.get('/median/:assetId', async (c) => {
  const assetId = c.req.param('assetId') as `0x${string}`;

  const result = await publicClient.readContract({
    address: CONTRACTS.OracleRouter.address,
    abi: CONTRACTS.OracleRouter.abi,
    functionName: 'getMedianPrice',
    args: [assetId]
  }) as [bigint, bigint];

  const [medianPrice, sourceCount] = result;

  return c.json({
    assetId,
    medianPrice: medianPrice.toString(),
    sourceCount: Number(sourceCount),
    decimals: 8
  });
});

// Pyth TradingView symbol mapping for chart data
const PYTH_TV_SYMBOLS: Record<string, string> = {
  // Precious Metals
  XAU: 'Metal.XAU/USD',
  XAG: 'Metal.XAG/USD',
  XPT: 'Metal.XPT/USD',
  XPD: 'Metal.XPD/USD',
  // Energy
  WTI: 'Commodities.USOILSPOT',
  BRT: 'Commodities.UKOILSPOT',
  // Agriculture & other commodities
  XCU: 'Metal.XCU/USD',
  NG: 'Commodities.NATGAS',
  // Equities — Pyth Equity.US.<TICKER>/USD
  AAPL: 'Equity.US.AAPL/USD',
  MSFT: 'Equity.US.MSFT/USD',
  GOOGL: 'Equity.US.GOOG/USD',
  AMZN: 'Equity.US.AMZN/USD',
  NVDA: 'Equity.US.NVDA/USD',
  META: 'Equity.US.META/USD',
  TSLA: 'Equity.US.TSLA/USD',
  JPM: 'Equity.US.JPM/USD',
  V: 'Equity.US.V/USD',
  MA: 'Equity.US.MA/USD',
  BAC: 'Equity.US.BAC/USD',
  MS: 'Equity.US.MS/USD',
  GS: 'Equity.US.GS/USD',
  AXP: 'Equity.US.AXP/USD',
  PYPL: 'Equity.US.PYPL/USD',
  COIN: 'Equity.US.COIN/USD',
  SQ: 'Equity.US.SQ/USD',
  JNJ: 'Equity.US.JNJ/USD',
  UNH: 'Equity.US.UNH/USD',
  LLY: 'Equity.US.LLY/USD',
  MRK: 'Equity.US.MRK/USD',
  PFE: 'Equity.US.PFE/USD',
  ABT: 'Equity.US.ABT/USD',
  TMO: 'Equity.US.TMO/USD',
  MDT: 'Equity.US.MDT/USD',
  WMT: 'Equity.US.WMT/USD',
  PG: 'Equity.US.PG/USD',
  KO: 'Equity.US.KO/USD',
  PEP: 'Equity.US.PEP/USD',
  COST: 'Equity.US.COST/USD',
  HD: 'Equity.US.HD/USD',
  LOW: 'Equity.US.LOW/USD',
  DIS: 'Equity.US.DIS/USD',
  NFLX: 'Equity.US.NFLX/USD',
  SBUX: 'Equity.US.SBUX/USD',
  ABNB: 'Equity.US.ABNB/USD',
  UBER: 'Equity.US.UBER/USD',
  AVGO: 'Equity.US.AVGO/USD',
  AMD: 'Equity.US.AMD/USD',
  INTC: 'Equity.US.INTC/USD',
  TXN: 'Equity.US.TXN/USD',
  QCOM: 'Equity.US.QCOM/USD',
  AMAT: 'Equity.US.AMAT/USD',
  CSCO: 'Equity.US.CSCO/USD',
  ADBE: 'Equity.US.ADBE/USD',
  CRM: 'Equity.US.CRM/USD',
  ORCL: 'Equity.US.ORCL/USD',
  IBM: 'Equity.US.IBM/USD',
  GE: 'Equity.US.GE/USD',
  CAT: 'Equity.US.CAT/USD',
  BA: 'Equity.US.BA/USD',
  HON: 'Equity.US.HON/USD',
  UPS: 'Equity.US.UPS/USD',
  RTX: 'Equity.US.RTX/USD',
  XOM: 'Equity.US.XOM/USD',
  CVX: 'Equity.US.CVX/USD',
  COP: 'Equity.US.COP/USD',
  SLB: 'Equity.US.SLB/USD',
  NEE: 'Equity.US.NEE/USD',
  T: 'Equity.US.T/USD',
  VZ: 'Equity.US.VZ/USD',
  CMCSA: 'Equity.US.CMCSA/USD',
  // ETFs
  QQQ: 'Equity.US.QQQ/USD',
  SPY: 'Equity.US.SPY/USD',
  IVV: 'Equity.US.IVV/USD',
  TLT: 'Equity.US.TLT/USD',
  SHY: 'Equity.US.SHY/USD',
  GBTC: 'Equity.US.GBTC/USD',
  IBIT: 'Equity.US.IBIT/USD',
  BITO: 'Equity.US.BITO/USD',
  VGSH: 'Equity.US.VGSH/USD',
  GOVT: 'Equity.US.GOVT/USD',
  BETH: 'Equity.US.BETH/USD',
  ETHA: 'Equity.US.ETHA/USD',
  HODL: 'Equity.US.HODL/USD',
  ARKB: 'Equity.US.ARKB/USD',
  FBTC: 'Equity.US.FBTC/USD',
  // FX
  EUR: 'FX.EUR/USD',
  GBP: 'FX.GBP/USD',
  JPY: 'FX.JPY/USD',
  AUD: 'FX.AUD/USD',
  CAD: 'FX.CAD/USD',
  CHF: 'FX.CHF/USD',
  CNY: 'FX.CNY/USD',
  NZD: 'FX.NZD/USD',
  SEK: 'FX.SEK/USD',
  NOK: 'FX.NOK/USD',
  SGD: 'FX.SGD/USD',
  HKD: 'FX.HKD/USD',
  KRW: 'FX.KRW/USD',
};

// Yahoo Finance chart range/interval mapping
const YAHOO_CHART_CONFIG: Record<string, { range: string; interval: string; filterLast?: number }> = {
  '1h':  { range: '1d', interval: '5m', filterLast: 24 },
  '24h': { range: '1d', interval: '5m' },
  '7d':  { range: '5d', interval: '30m' },
  '30d': { range: '1mo', interval: '1h' },
};

interface YahooChartHistoryResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

async function fetchYahooChartHistory(
  yahooSymbol: string,
  range: string,
  yahooCurrencyDivisor?: number
): Promise<Array<{ time: number; price: number }> | null> {
  const config = YAHOO_CHART_CONFIG[range] ?? YAHOO_CHART_CONFIG['24h']!;
  const url = `${ORACLE_APIS.YAHOO_FINANCE}/${encodeURIComponent(yahooSymbol)}?range=${config.range}&interval=${config.interval}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;

  const data = await response.json() as YahooChartHistoryResponse;
  if (data.chart.error || !data.chart.result?.[0]) return null;

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0]?.close;

  if (!timestamps || !closes) return null;

  let prices: Array<{ time: number; price: number }> = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closePrice = closes[i];
    if (closePrice != null && closePrice > 0) {
      let price = closePrice;
      if (yahooCurrencyDivisor) {
        price = price / yahooCurrencyDivisor;
      }
      prices.push({ time: timestamps[i]!, price });
    }
  }

  if (config.filterLast && prices.length > config.filterLast) {
    prices = prices.slice(-config.filterLast);
  }

  return prices;
}

// GET /prices/:assetId/history - Historical price data (Pyth primary, Yahoo fallback)
app.get('/:assetId/history', async (c) => {
  try {
    const assetId = c.req.param('assetId') as `0x${string}`;
    const range = c.req.query('range') || '24h';

    const asset = getAssetById(assetId);
    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    // Strategy 1: Try Pyth Benchmarks (primary source for most assets)
    const pythSymbol = PYTH_TV_SYMBOLS[asset.symbol];
    if (pythSymbol) {
      // Pyth Benchmarks data can be delayed (market hours only), so for short
      // ranges we fetch a wider window and slice to the last N points.
      const rangeConfig: Record<string, { resolution: string; seconds: number; lastN?: number }> = {
        '1h':  { resolution: '1',   seconds: 86400, lastN: 60 },
        '24h': { resolution: '5',   seconds: 86400 },
        '7d':  { resolution: '30',  seconds: 604800 },
        '30d': { resolution: '120', seconds: 2592000 },
      };

      const config = rangeConfig[range] ?? rangeConfig['24h']!;
      const now = Math.floor(Date.now() / 1000);
      const from = now - config.seconds;

      const url = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=${encodeURIComponent(pythSymbol)}&resolution=${config.resolution}&from=${from}&to=${now}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json() as {
          s: string; t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[];
        };

        if (data.s === 'ok' && data.t && data.t.length > 0) {
          let prices = data.t.map((time, i) => ({ time, price: data.c[i] }));
          // For short ranges, slice to the last N points
          if (config.lastN && prices.length > config.lastN) {
            prices = prices.slice(-config.lastN);
          }
          return c.json({ assetId, range, interval: config.resolution, source: 'Pyth', prices });
        }
      }
      // If Pyth fails or returns no data, fall through to Yahoo
    }

    // Strategy 2: Fall back to Yahoo Finance chart API
    if (asset.yahooSymbol) {
      const prices = await fetchYahooChartHistory(asset.yahooSymbol, range, asset.yahooCurrencyDivisor);
      if (prices && prices.length > 0) {
        return c.json({ assetId, range, interval: range, source: 'Yahoo', prices });
      }
    }

    // Strategy 3: CSV historical data (ADX stocks)
    if (asset.csvFile) {
      const csvData = getCSVHistory(asset.symbol);
      if (csvData.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        const rangeSeconds: Record<string, number> = {
          '1h': 3600, '24h': 86400, '7d': 604800, '30d': 2592000, '1y': 31536000,
        };
        const cutoff = now - (rangeSeconds[range] || 31536000);
        const filtered = csvData.filter(d => d.time >= cutoff);
        const prices = (filtered.length > 0 ? filtered : csvData).map(d => ({
          time: d.time,
          price: d.price,
        }));
        return c.json({ assetId, range, interval: '1D', source: 'CSV', prices });
      }
    }

    // No chart data available from any source
    return c.json({ assetId, range, interval: range, source: 'none', prices: [] });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return c.json({ error: 'Failed to fetch price history' }, 500);
  }
});

// GET /prices/:assetId - Latest prices for specific asset (generic, comes last)
app.get('/:assetId', async (c) => {
  const assetId = c.req.param('assetId');

  const prices = db.query(`
    SELECT source, price, timestamp
    FROM prices
    WHERE asset_id = ?
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(assetId);

  return c.json({ assetId, prices });
});

export default app;
