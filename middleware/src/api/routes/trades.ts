import { Hono } from 'hono';
import { db } from '../../lib/db';

const app = new Hono();

// GET /trades - Recent trades (paginated)
app.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const assetId = c.req.query('assetId');

  let query = 'SELECT * FROM trades';
  let params: any[] = [];

  if (assetId) {
    query += ' WHERE asset_id = ?';
    params.push(assetId);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const trades = db.query(query).all(...params);

  return c.json({ trades, limit, offset });
});

// GET /trades/:address - Trades for specific address
app.get('/:address', (c) => {
  const address = c.req.param('address').toLowerCase();
  const limit = parseInt(c.req.query('limit') || '50');

  const trades = db.query(`
    SELECT * FROM trades
    WHERE trader = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(address, limit);

  return c.json({ address, trades });
});

export default app;
