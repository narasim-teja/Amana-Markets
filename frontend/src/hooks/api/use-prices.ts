import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SourcePrice {
  price: string;
  timestamp: number;
  status: 'ok' | 'stale' | 'error';
}

export interface LivePriceData {
  assetId: string;
  symbol: string;
  name: string;
  displayPrice: string;
  displayPriceRaw: string;
  sources: {
    dia?: SourcePrice;
    pyth?: SourcePrice;
    redstone?: SourcePrice;
  };
  median: string;
  lastUpdated: number;
  cacheStatus: 'fresh' | 'stale';
}

export function useLivePrice(assetId: string | null) {
  const { data: price = null, isLoading } = useQuery({
    queryKey: ['live-price', assetId],
    queryFn: async () => {
      const response = await apiClient.getLivePrice(assetId!);
      return (response.price ?? null) as LivePriceData | null;
    },
    enabled: !!assetId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return { price, isLoading };
}
