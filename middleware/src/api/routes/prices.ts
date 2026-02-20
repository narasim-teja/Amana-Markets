import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';

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

// GET /prices/:assetId - Latest prices for specific asset
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

export default app;
