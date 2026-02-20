import { Hono } from 'hono';
import { db } from '../../lib/db';

const app = new Hono();

// GET /assets - All registered assets
app.get('/', (c) => {
  const assets = db.query(`
    SELECT asset_id, name, symbol, token_address, is_paused
    FROM assets
  `).all();

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
