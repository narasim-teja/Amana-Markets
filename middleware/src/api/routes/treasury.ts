import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';

const app = new Hono();

// GET /treasury/stats - Current treasury statistics
app.get('/stats', async (c) => {
  const [totalAssets, utilization, availableLiquidity] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.LiquidityVault.address,
      abi: CONTRACTS.LiquidityVault.abi,
      functionName: 'totalAssets'
    }),
    publicClient.readContract({
      address: CONTRACTS.LiquidityVault.address,
      abi: CONTRACTS.LiquidityVault.abi,
      functionName: 'utilization'
    }),
    publicClient.readContract({
      address: CONTRACTS.LiquidityVault.address,
      abi: CONTRACTS.LiquidityVault.abi,
      functionName: 'availableLiquidity'
    })
  ]);

  return c.json({
    totalAssets: (totalAssets as bigint).toString(),
    utilization: Number(utilization),
    availableLiquidity: (availableLiquidity as bigint).toString()
  });
});

// GET /treasury/exposure - Asset exposure breakdown
app.get('/exposure', async (c) => {
  // Get all registered assets
  const assets = db.query(`SELECT asset_id FROM assets`).all() as { asset_id: string }[];

  // Read totalExposure and per-asset exposure directly from contract
  const [totalExposure, ...perAssetExposures] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.LiquidityVault.address,
      abi: CONTRACTS.LiquidityVault.abi,
      functionName: 'totalExposure'
    }) as Promise<bigint>,
    ...assets.map(a =>
      publicClient.readContract({
        address: CONTRACTS.LiquidityVault.address,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'assetExposure',
        args: [a.asset_id as `0x${string}`]
      }) as Promise<bigint>
    )
  ]);

  const assetExposures = assets.map((a, i) => ({
    asset_id: a.asset_id,
    asset_exposure: perAssetExposures[i].toString()
  }));

  return c.json({
    totalExposure: totalExposure.toString(),
    assetExposures
  });
});

// GET /treasury/deposits - Deposit history
app.get('/deposits', (c) => {
  const lp = c.req.query('lp')?.toLowerCase();
  const limit = parseInt(c.req.query('limit') || '50');

  let query = `SELECT * FROM vault_events WHERE type IN ('deposit', 'withdrawal')`;
  let params: any[] = [];

  if (lp) {
    query += ' AND lp = ?';
    params.push(lp);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const events = db.query(query).all(...params);

  return c.json({ events });
});

export default app;
