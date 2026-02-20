/**
 * WebSocket Manager for Real-Time Price Feed
 * Handles connection, reconnection, subscriptions, and message broadcasting
 */

/**
 * Price update matching LivePriceData from middleware server
 */
export interface PriceUpdate {
  assetId: string;
  symbol: string;
  name: string;
  displayPrice: string;
  displayPriceRaw: string;
  sources: {
    dia?: { price: string; timestamp: number; status: 'ok' | 'stale' | 'error' };
    pyth?: { price: string; timestamp: number; status: 'ok' | 'stale' | 'error' };
    redstone?: { price: string; timestamp: number; status: 'ok' | 'stale' | 'error' };
  };
  median: string;
  lastUpdated: number;
  cacheStatus: 'fresh' | 'stale';
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  assetId?: string;
}

interface WebSocketResponse {
  type: 'priceUpdate' | 'subscribed' | 'unsubscribed' | 'pong' | 'error';
  data?: PriceUpdate[];
  assetId?: string;
  message?: string;
  timestamp: number;
}

type MessageHandler = (data: WebSocketResponse) => void;
type ErrorHandler = (error: Error) => void;
type ConnectionHandler = () => void;

/**
 * Price WebSocket Client
 * Manages connection to middleware WebSocket server
 */
export class PriceWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1s
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private openHandlers: Set<ConnectionHandler> = new Set();
  private closeHandlers: Set<ConnectionHandler> = new Set();
  private subscribedAssets: Set<string> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws/prices';
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      console.log('[WebSocket] Connecting to', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Resubscribe to assets after reconnection
        this.subscribedAssets.forEach((assetId) => {
          this.send({ type: 'subscribe', assetId });
        });

        // Start ping interval
        this.startPing();

        // Notify all open handlers
        this.openHandlers.forEach((handler) => handler());
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketResponse = JSON.parse(event.data);

          // Log price updates (optional, can be removed in production)
          if (message.type === 'priceUpdate') {
            console.log('[WebSocket] Price update received:', message.data?.length || 0, 'assets');
          }

          // Notify all message handlers
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.errorHandlers.forEach((handler) =>
          handler(new Error('WebSocket connection error'))
        );
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.stopPing();
        this.closeHandlers.forEach((handler) => handler());
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.stopPing();
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to price updates for specific asset
   */
  subscribe(assetId: string) {
    this.subscribedAssets.add(assetId);
    this.send({ type: 'subscribe', assetId });
    console.log('[WebSocket] Subscribed to asset:', assetId);
  }

  /**
   * Unsubscribe from price updates for specific asset
   */
  unsubscribe(assetId: string) {
    this.subscribedAssets.delete(assetId);
    this.send({ type: 'unsubscribe', assetId });
    console.log('[WebSocket] Unsubscribed from asset:', assetId);
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.errorHandlers.forEach((handler) =>
        handler(new Error('Max reconnection attempts reached'))
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Register open handler
   */
  onOpen(handler: ConnectionHandler) {
    this.openHandlers.add(handler);
    return () => this.openHandlers.delete(handler);
  }

  /**
   * Register close handler
   */
  onClose(handler: ConnectionHandler) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Singleton instance
 */
let wsInstance: PriceWebSocket | null = null;

/**
 * Get or create WebSocket singleton instance
 */
export function getPriceWebSocket(): PriceWebSocket {
  if (!wsInstance) {
    wsInstance = new PriceWebSocket();
  }
  return wsInstance;
}

/**
 * Reset WebSocket instance (useful for testing)
 */
export function resetPriceWebSocket() {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}
