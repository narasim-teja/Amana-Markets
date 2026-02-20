import { Hono } from 'hono';
import { cors } from 'hono/cors';
import prices from './routes/prices';
import assets from './routes/assets';
import trades from './routes/trades';
import vault from './routes/vault';
import users from './routes/users';
import analytics from './routes/analytics';
import health from './routes/health';
import { priceWebSocketServer } from '../services/websocket';
import type { ServerWebSocket } from 'bun';

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
  ],
  websocket: {
    endpoint: '/ws/prices',
    description: 'Real-time price updates via WebSocket'
  }
}));

interface WebSocketData {
  subscribedAssets: Set<string>;
  clientId: string;
}

export async function startAPI() {
  const port = parseInt(process.env.API_PORT || '3000');

  console.log(`🚀 API Server starting on port ${port}...`);

  const server = Bun.serve({
    port,
    fetch(req, server) {
      // Check if this is a WebSocket upgrade request
      const url = new URL(req.url);
      if (url.pathname === '/ws/prices') {
        const upgraded = server.upgrade(req, {
          data: {
            subscribedAssets: new Set<string>(),
            clientId: `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
          } as WebSocketData
        });

        if (upgraded) {
          return undefined; // WebSocket upgrade successful
        }

        // Upgrade failed
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // Regular HTTP request, handle with Hono
      return app.fetch(req, server);
    },
    websocket: {
      open(ws) {
        priceWebSocketServer.addClient(ws as ServerWebSocket<WebSocketData>);
      },
      message(ws, message) {
        const msgString = typeof message === 'string' ? message : new TextDecoder().decode(message);
        priceWebSocketServer.handleMessage(ws as ServerWebSocket<WebSocketData>, msgString);
      },
      close(ws) {
        priceWebSocketServer.removeClient(ws as ServerWebSocket<WebSocketData>);
      }
    }
  });

  // Start WebSocket price broadcasting
  priceWebSocketServer.start();

  console.log(`✅ API Server running on http://localhost:${port}`);
  console.log(`📡 WebSocket server running on ws://localhost:${port}/ws/prices`);

  return server;
}
