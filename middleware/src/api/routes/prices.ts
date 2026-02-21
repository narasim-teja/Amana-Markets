import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { getLivePrices } from '../../services/livePrices';
import { formatPrice } from '../../lib/utils';
import { getAssetById } from '../../config/assets';
import type { AssetCategory } from '../../config/assets';

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
  XAU: 'Metal.XAU/USD',
  XAG: 'Metal.XAG/USD',
  XPT: 'Metal.XPT/USD',
  XPD: 'Metal.XPD/USD',
  WTI: 'Commodities.USOILSPOT',
  BRT: 'Commodities.UKOILSPOT',
};

// GET /prices/:assetId/history - Historical price data from Pyth Benchmarks API
app.get('/:assetId/history', async (c) => {
  try {
    const assetId = c.req.param('assetId') as `0x${string}`;
    const range = c.req.query('range') || '24h';

    const asset = getAssetById(assetId);
    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    const pythSymbol = PYTH_TV_SYMBOLS[asset.symbol];
    if (!pythSymbol) {
      return c.json({ error: 'No chart data available for this asset' }, 404);
    }

    // Map range to Pyth TradingView resolution and time window
    const rangeConfig: Record<string, { resolution: string; seconds: number }> = {
      '1h':  { resolution: '1',   seconds: 3600 },
      '24h': { resolution: '5',   seconds: 86400 },
      '7d':  { resolution: '30',  seconds: 604800 },
      '30d': { resolution: '120', seconds: 2592000 },
    };

    const config = rangeConfig[range] ?? rangeConfig['24h']!;
    const now = Math.floor(Date.now() / 1000);
    const from = now - config.seconds;

    const url = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=${encodeURIComponent(pythSymbol)}&resolution=${config.resolution}&from=${from}&to=${now}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pyth API returned ${response.status}`);
    }

    const data = await response.json() as {
      s: string;
      t: number[];
      o: number[];
      h: number[];
      l: number[];
      c: number[];
      v: number[];
    };

    if (data.s !== 'ok' || !data.t || data.t.length === 0) {
      return c.json({ assetId, range, interval: config!.resolution, source: 'Pyth', prices: [] });
    }

    // Use close prices for the chart
    const prices = data.t.map((time, i) => ({
      time,
      price: data.c[i],
    }));

    return c.json({ assetId, range, interval: config!.resolution, source: 'Pyth', prices });
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
