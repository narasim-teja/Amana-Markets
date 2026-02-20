import { useEffect, useState } from 'react';
import { getPriceWebSocket, PriceUpdate } from '@/lib/websocket';

export function useLivePrice(assetId: string | null) {
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!assetId) return;

    const ws = getPriceWebSocket();

    const unsubOpen = ws.onOpen(() => {
      setIsConnected(true);
    });

    const unsubClose = ws.onClose(() => {
      setIsConnected(false);
    });

    const unsubMessage = ws.onMessage((message) => {
      if (message.type === 'priceUpdate' && message.data) {
        const update = message.data.find((p) => p.assetId === assetId);
        if (update) {
          setPrice(update);
        }
      }
    });

    ws.subscribe(assetId);
    ws.connect();

    return () => {
      unsubOpen();
      unsubClose();
      unsubMessage();
      ws.unsubscribe(assetId);
    };
  }, [assetId]);

  return { price, isConnected };
}
