import type { ServerWebSocket } from 'bun';
import { getLivePrices, type LivePriceData } from './livePrices';

interface WebSocketData {
  subscribedAssets: Set<string>;
  clientId: string;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  assetId?: string;
}

interface WebSocketResponse {
  type: 'priceUpdate' | 'subscribed' | 'unsubscribed' | 'pong' | 'error';
  data?: LivePriceData[];
  assetId?: string;
  message?: string;
  timestamp: number;
}

export class PriceWebSocketServer {
  private clients: Set<ServerWebSocket<WebSocketData>> = new Set();
  private broadcastInterval: Timer | null = null;
  private intervalMs: number;

  constructor() {
    this.intervalMs = parseInt(process.env.WS_BROADCAST_INTERVAL || '5000');
  }

  start() {
    console.log(`📡 WebSocket price broadcasting starting (interval: ${this.intervalMs}ms)...`);

    // Broadcast price updates periodically
    this.broadcastInterval = setInterval(async () => {
      await this.broadcastPrices();
    }, this.intervalMs);
  }

  stop() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    // Close all client connections
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    console.log('📡 WebSocket server stopped');
  }

  addClient(ws: ServerWebSocket<WebSocketData>) {
    this.clients.add(ws);
    console.log(`📡 WebSocket client connected (${ws.data.clientId}). Total clients: ${this.clients.size}`);
  }

  removeClient(ws: ServerWebSocket<WebSocketData>) {
    this.clients.delete(ws);
    console.log(`📡 WebSocket client disconnected (${ws.data.clientId}). Total clients: ${this.clients.size}`);
  }

  handleMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
    try {
      const msg: WebSocketMessage = JSON.parse(message);

      switch (msg.type) {
        case 'subscribe':
          if (msg.assetId) {
            ws.data.subscribedAssets.add(msg.assetId);
            this.sendMessage(ws, {
              type: 'subscribed',
              assetId: msg.assetId,
              message: `Subscribed to asset ${msg.assetId}`,
              timestamp: Date.now()
            });
            console.log(`📡 Client ${ws.data.clientId} subscribed to ${msg.assetId}`);
          }
          break;

        case 'unsubscribe':
          if (msg.assetId) {
            ws.data.subscribedAssets.delete(msg.assetId);
            this.sendMessage(ws, {
              type: 'unsubscribed',
              assetId: msg.assetId,
              message: `Unsubscribed from asset ${msg.assetId}`,
              timestamp: Date.now()
            });
            console.log(`📡 Client ${ws.data.clientId} unsubscribed from ${msg.assetId}`);
          }
          break;

        case 'ping':
          this.sendMessage(ws, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;

        default:
          this.sendMessage(ws, {
            type: 'error',
            message: `Unknown message type: ${(msg as any).type}`,
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      this.sendMessage(ws, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now()
      });
    }
  }

  private async broadcastPrices() {
    if (this.clients.size === 0) {
      return; // No clients, skip broadcast
    }

    try {
      // Fetch all live prices
      const allPrices = await getLivePrices();

      // Broadcast to each client with their subscriptions
      for (const client of this.clients) {
        // Filter prices based on client subscriptions
        const relevantPrices = this.filterPricesForClient(allPrices, client.data.subscribedAssets);

        if (relevantPrices.length > 0) {
          this.sendMessage(client, {
            type: 'priceUpdate',
            data: relevantPrices,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error broadcasting prices:', error);
    }
  }

  private filterPricesForClient(prices: LivePriceData[], subscribedAssets: Set<string>): LivePriceData[] {
    // If no subscriptions, send all prices
    if (subscribedAssets.size === 0) {
      return prices;
    }

    // Filter to only subscribed assets
    return prices.filter(price => subscribedAssets.has(price.assetId));
  }

  private sendMessage(ws: ServerWebSocket<WebSocketData>, response: WebSocketResponse) {
    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      broadcastInterval: this.intervalMs,
      isRunning: this.broadcastInterval !== null
    };
  }
}

// Singleton instance
export const priceWebSocketServer = new PriceWebSocketServer();
