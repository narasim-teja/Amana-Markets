import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { getLivePrices } from '../../services/livePrices';
import { formatPrice } from '../../lib/utils';

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

    const livePrice = livePrices[0];

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

// GET /prices/live - All assets, real-time from oracle APIs
app.get('/live', async (c) => {
  try {
    const livePrices = await getLivePrices();

    return c.json({
      prices: livePrices,
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

// GET /prices/:assetId/history - Historical price data for charts
app.get('/:assetId/history', async (c) => {
  try {
    const assetId = c.req.param('assetId');
    const range = c.req.query('range') || '24h';
    const source = c.req.query('source') || 'Pyth';

    const rangeConfig: Record<string, { seconds: number; interval: number }> = {
      '1h':  { seconds: 3600,    interval: 60 },
      '24h': { seconds: 86400,   interval: 300 },
      '7d':  { seconds: 604800,  interval: 1800 },
      '30d': { seconds: 2592000, interval: 7200 },
    };

    const config = rangeConfig[range] || rangeConfig['24h'];
    const fromTimestamp = Math.floor(Date.now() / 1000) - config.seconds;

    // Use a single oracle source for clean chart data
    const prices = db.query(`
      SELECT
        (timestamp / ?1) * ?1 AS time,
        AVG(CAST(price AS REAL) / 1e8) AS price
      FROM prices
      WHERE asset_id = ?2 AND timestamp >= ?3 AND source = ?4
      GROUP BY (timestamp / ?1)
      ORDER BY time ASC
    `).all(config.interval, assetId, fromTimestamp, source);

    return c.json({ assetId, range, interval: config.interval, source, prices });
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
