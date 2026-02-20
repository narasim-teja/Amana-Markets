import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getPriceWebSocket } from '@/lib/websocket';
import type { TimeRange } from '@/components/charts/timeframe-selector';

interface ChartDataPoint {
  time: number;
  price: number;
}

interface UsePriceChartReturn {
  data: ChartDataPoint[];
  latestPoint: ChartDataPoint | null;
  isLoading: boolean;
  error: Error | null;
  range: TimeRange;
  setRange: (range: TimeRange) => void;
}

export function usePriceChart(assetId: string | null): UsePriceChartReturn {
  const [range, setRange] = useState<TimeRange>('24h');
  const [latestPoint, setLatestPoint] = useState<ChartDataPoint | null>(null);
  const realtimePointsRef = useRef<ChartDataPoint[]>([]);
  const lastPriceRef = useRef<number | null>(null);

  // Fetch historical data
  const { data: historicalData, isLoading, error } = useQuery({
    queryKey: ['price-chart', assetId, range],
    queryFn: () => apiClient.getPriceChartData(assetId!, range),
    enabled: !!assetId,
    staleTime: 30_000,
  });

  // Subscribe to WebSocket for real-time updates
  useEffect(() => {
    if (!assetId) return;

    const ws = getPriceWebSocket();

    const unsubMessage = ws.onMessage((message) => {
      if (message.type === 'priceUpdate' && message.data) {
        const update = message.data.find((p) => p.assetId === assetId);
        if (update && update.median) {
          const price = parseFloat(update.median);

          // Skip if price hasn't changed
          if (lastPriceRef.current === price) return;
          lastPriceRef.current = price;

          const point: ChartDataPoint = {
            time: update.lastUpdated,
            price,
          };
          setLatestPoint(point);
          realtimePointsRef.current.push(point);
        }
      }
    });

    ws.subscribe(assetId);
    ws.connect();

    return () => {
      unsubMessage();
      ws.unsubscribe(assetId);
    };
  }, [assetId]);

  // Reset real-time buffer on range/asset change
  useEffect(() => {
    realtimePointsRef.current = [];
    lastPriceRef.current = null;
    setLatestPoint(null);
  }, [range, assetId]);

  // Combine historical + real-time data
  const chartData = historicalData?.prices ?? [];

  const lastHistoricalTime =
    chartData.length > 0 ? chartData[chartData.length - 1].time : 0;
  const newRealtimePoints = realtimePointsRef.current.filter(
    (p) => p.time > lastHistoricalTime
  );

  const combinedData = [...chartData, ...newRealtimePoints];

  return {
    data: combinedData,
    latestPoint,
    isLoading,
    error: error as Error | null,
    range,
    setRange,
  };
}
