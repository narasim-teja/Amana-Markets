import { Hono } from 'hono';
import { db } from '../../lib/db';
import { publicClient } from '../../lib/viem';

const app = new Hono();

app.get('/', async (c) => {
  try {
    // Check database
    const dbCheck = db.query('SELECT 1').get();

    // Check blockchain connection
    const blockNumber = await publicClient.getBlockNumber();

    // Get indexer state
    const lastBlock = db.query('SELECT last_block FROM indexer_state WHERE id = 1').get() as { last_block: number };

    // Count indexed data
    const stats = {
      trades: db.query('SELECT COUNT(*) as count FROM trades').get() as { count: number },
      prices: db.query('SELECT COUNT(*) as count FROM prices').get() as { count: number },
      vaultEvents: db.query('SELECT COUNT(*) as count FROM vault_events').get() as { count: number }
    };

    return c.json({
      status: 'healthy',
      timestamp: Date.now(),
      blockchain: {
        connected: true,
        latestBlock: Number(blockNumber)
      },
      indexer: {
        lastIndexedBlock: lastBlock.last_block,
        blocksBehind: Number(blockNumber) - lastBlock.last_block
      },
      database: {
        trades: stats.trades.count,
        prices: stats.prices.count,
        vaultEvents: stats.vaultEvents.count
      }
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      error: String(error)
    }, 500);
  }
});

export default app;
