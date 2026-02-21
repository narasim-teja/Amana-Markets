import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';

const app = new Hono();

// GET /analytics/volume - Trade volume over time
app.get('/volume', (c) => {
  const period = c.req.query('period') || '24h'; // 24h, 7d, 30d

  const secondsMap: Record<string, number> = { '24h': 86400, '7d': 604800, '30d': 2592000 };
  const seconds = secondsMap[period] || 86400;
  const cutoff = Math.floor(Date.now() / 1000) - seconds;

  const volumeByAsset = db.query(`
    SELECT
      asset_id,
      COUNT(*) as trade_count,
      SUM(CAST(stablecoin_amount AS INTEGER)) as total_volume,
      SUM(CASE WHEN is_buy = 1 THEN 1 ELSE 0 END) as buy_count,
      SUM(CASE WHEN is_buy = 0 THEN 1 ELSE 0 END) as sell_count
    FROM trades
    WHERE timestamp >= ?
    GROUP BY asset_id
  `).all(cutoff);

  return c.json({ period, volumeByAsset });
});

// GET /analytics/fees - Fee collection stats
app.get('/fees', async (c) => {
  let totalFees = BigInt(0);
  try {
    totalFees = await publicClient.readContract({
      address: CONTRACTS.TradingEngine.address,
      abi: CONTRACTS.TradingEngine.abi,
      functionName: 'totalFeesCollected'
    }) as bigint;
  } catch (err) {
    console.error('Failed to read totalFeesCollected from contract:', err);
    // Fallback: sum from indexed trades
    const row = db.query(
      `SELECT COALESCE(SUM(CAST(fee AS INTEGER)), 0) as total FROM trades`
    ).get() as { total: number };
    totalFees = BigInt(row.total);
  }

  const feesByAsset = db.query(`
    SELECT
      asset_id,
      SUM(CAST(fee AS INTEGER)) as total_fees
    FROM trades
    GROUP BY asset_id
  `).all();

  return c.json({
    totalFees: totalFees.toString(),
    feesByAsset
  });
});

// GET /analytics/traders - Trader statistics
app.get('/traders', (c) => {
  const stats = db.query(`
    SELECT
      COUNT(DISTINCT trader) as unique_traders,
      COUNT(*) as total_trades
    FROM trades
  `).get();

  const topTraders = db.query(`
    SELECT
      trader,
      COUNT(*) as trade_count,
      SUM(CAST(stablecoin_amount AS INTEGER)) as total_volume
    FROM trades
    GROUP BY trader
    ORDER BY total_volume DESC
    LIMIT 10
  `).all();

  return c.json({ stats, topTraders });
});

export default app;
