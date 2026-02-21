import { Hono } from 'hono';
import { cors } from 'hono/cors';
import prices from './routes/prices';
import assets from './routes/assets';
import trades from './routes/trades';
import treasury from './routes/treasury';
import users from './routes/users';
import analytics from './routes/analytics';
import health from './routes/health';
import config from './routes/config';
import sponsor from './routes/sponsor';

const app = new Hono();

// CORS for frontend
app.use('/*', cors());

// Mount routes
app.route('/prices', prices);
app.route('/assets', assets);
app.route('/trades', trades);
app.route('/treasury', treasury);
app.route('/users', users);
app.route('/analytics', analytics);
app.route('/health', health);
app.route('/config', config);
app.route('/sponsor', sponsor);

// Bundler proxy — avoids CORS issues when frontend calls the bundler directly
app.post('/bundler', async (c) => {
  const bundlerUrl = process.env.BUNDLER_URL || 'http://localhost:4337';
  try {
    const body = await c.req.text();
    const res = await fetch(bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json();
    return c.json(data);
  } catch (error: any) {
    console.error('[Bundler Proxy] Error:', error.message);
    return c.json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Bundler unreachable: ' + error.message } }, 502);
  }
});

// Root
app.get('/', (c) => c.json({
  name: 'ADI Marketplace API',
  version: '1.0.0',
  endpoints: [
    '/prices',
    '/prices/live',
    '/assets',
    '/trades',
    '/treasury',
    '/users',
    '/analytics',
    '/health',
    '/config',
    '/sponsor'
  ]
}));

export async function startAPI() {
  const port = parseInt(process.env.API_PORT || '3000');

  console.log(`🚀 API Server starting on port ${port}...`);

  const server = Bun.serve({
    port,
    fetch(req) {
      return app.fetch(req);
    }
  });

  console.log(`✅ API Server running on http://localhost:${port}`);

  return server;
}
