import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';

const app = new Hono();

// GET /assets - All registered assets with on-chain spread data
app.get('/', async (c) => {
  const dbAssets = db.query(`
    SELECT asset_id, name, symbol, token_address, is_paused, spread_bps
    FROM assets
  `).all() as { asset_id: string; name: string; symbol: string; token_address: string; is_paused: number; spread_bps: number | null }[];

  // Read on-chain spread for each asset in parallel
  const onChainData = await Promise.all(
    dbAssets.map(a =>
      publicClient.readContract({
        address: CONTRACTS.AssetRegistry.address,
        abi: CONTRACTS.AssetRegistry.abi,
        functionName: 'getAsset',
        args: [a.asset_id as `0x${string}`]
      }).catch(() => null)
    )
  );

  const assets = dbAssets.map((a, i) => {
    const config = onChainData[i] as any;
    return {
      ...a,
      spread_bps: config ? Number(config.baseSpreadBps) : (a.spread_bps || 0),
    };
  });

  return c.json({ assets });
});

// GET /assets/:assetId - Specific asset details
app.get('/:assetId', (c) => {
  const assetId = c.req.param('assetId');

  const asset = db.query(`
    SELECT * FROM assets WHERE asset_id = ?
  `).get(assetId);

  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  return c.json({ asset });
});

export default app;
