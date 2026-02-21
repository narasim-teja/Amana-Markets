import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

export function usePriceChart(assetId: string | null, defaultRange: TimeRange = '24h'): UsePriceChartReturn {
  const [range, setRange] = useState<TimeRange>(defaultRange);
  const prevAssetId = useRef(assetId);

  // Reset range to default when asset changes
  useEffect(() => {
    if (assetId !== prevAssetId.current) {
      prevAssetId.current = assetId;
      setRange(defaultRange);
    }
  }, [assetId, defaultRange]);

  const { data: historicalData, isLoading, error } = useQuery({
    queryKey: ['price-chart', assetId, range],
    queryFn: () => apiClient.getPriceChartData(assetId!, range),
    enabled: !!assetId,
    staleTime: 30_000,
  });

  const chartData = historicalData?.prices ?? [];
  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return {
    data: chartData,
    latestPoint,
    isLoading,
    error: error as Error | null,
    range,
    setRange,
  };
}
