import { useEffect, useState } from 'react';
import { getPriceWebSocket, PriceUpdate } from '@/lib/websocket';

export function useLivePrice(assetId: string | null) {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!assetId) return;

    const ws = getPriceWebSocket();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handlePriceUpdate = (update: PriceUpdate) => {
      if (update.assetId === assetId) {
        setPrice(update);
      }
    };

    ws.on('connect', handleConnect);
    ws.on('disconnect', handleDisconnect);
    ws.on('price', handlePriceUpdate);

    ws.subscribe(assetId);
    ws.connect();

    return () => {
      ws.off('connect', handleConnect);
      ws.off('disconnect', handleDisconnect);
      ws.off('price', handlePriceUpdate);
      ws.unsubscribe(assetId);
    };
  }, [assetId]);

  return { price, isConnected };
}
