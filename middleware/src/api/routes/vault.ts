import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';

const app = new Hono();

// GET /vault/stats - Current vault statistics
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

// GET /vault/exposure - Asset exposure breakdown
app.get('/exposure', async (c) => {
  const totalExposure = await publicClient.readContract({
    address: CONTRACTS.LiquidityVault.address,
    abi: CONTRACTS.LiquidityVault.abi,
    functionName: 'totalExposure'
  }) as bigint;

  // Get per-asset exposure from latest exposure events
  const exposures = db.query(`
    SELECT asset_id, asset_exposure
    FROM vault_events
    WHERE type = 'exposure'
      AND asset_id IS NOT NULL
      AND timestamp = (
        SELECT MAX(timestamp)
        FROM vault_events ve2
        WHERE ve2.asset_id = vault_events.asset_id
          AND ve2.type = 'exposure'
      )
  `).all();

  return c.json({
    totalExposure: totalExposure.toString(),
    assetExposures: exposures
  });
});

// GET /vault/deposits - Deposit history
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
