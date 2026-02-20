import { Hono } from 'hono';
import { cors } from 'hono/cors';
import prices from './routes/prices';
import assets from './routes/assets';
import trades from './routes/trades';
import vault from './routes/vault';
import users from './routes/users';
import analytics from './routes/analytics';
import health from './routes/health';

const app = new Hono();

// CORS for frontend
app.use('/*', cors());

// Mount routes
app.route('/prices', prices);
app.route('/assets', assets);
app.route('/trades', trades);
app.route('/vault', vault);
app.route('/users', users);
app.route('/analytics', analytics);
app.route('/health', health);

// Root
app.get('/', (c) => c.json({
  name: 'ADI Marketplace API',
  version: '1.0.0',
  endpoints: [
    '/prices',
    '/prices/live',
    '/assets',
    '/trades',
    '/vault',
    '/users',
    '/analytics',
    '/health'
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
