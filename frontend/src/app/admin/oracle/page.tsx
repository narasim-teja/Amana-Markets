'use client';

/**
 * Oracle Status Page
 * Monitor oracle price feeds and health
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { getPriceWebSocket, PriceUpdate } from '@/lib/websocket';
import type { LivePriceData } from '@/types/api';
import { enrichAssetWithMetadata, type ApiAsset } from '@/lib/assets';
import { formatRelativeTime, isPriceStale } from '@/lib/format';
import { REFETCH_INTERVAL_FAST } from '@/lib/constants';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Radio,
  TrendingUp,
} from 'lucide-react';

interface OracleSource {
  name: string;
  price: string;
  timestamp: number;
  isStale: boolean;
}

interface AssetOracleData {
  assetId: string;
  name: string;
  symbol: string;
  color: string;
  sources: OracleSource[];
  medianPrice: number;
  allHealthy: boolean;
}

export default function OracleStatusPage() {
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch assets
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: ApiAsset) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch initial prices
  const { data: initialPrices } = useQuery({
    queryKey: ['prices', 'live'],
    queryFn: () => apiClient.getLivePrices(),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Connect to WebSocket for real-time price updates
  useEffect(() => {
    const ws = getPriceWebSocket();

    // Register handlers
    const unsubOpen = ws.onOpen(() => {
      console.log('[Oracle Status] WebSocket connected');
      setWsConnected(true);
    });

    const unsubClose = ws.onClose(() => {
      console.log('[Oracle Status] WebSocket disconnected');
      setWsConnected(false);
    });

    const unsubMessage = ws.onMessage((message) => {
      if (message.type === 'priceUpdate' && message.data) {
        message.data.forEach((update: PriceUpdate) => {
          setLivePrices((prev) => ({
            ...prev,
            [update.assetId]: update,
          }));
        });
      }
    });

    // Subscribe to all assets
    if (assetsData) {
      assetsData.forEach((asset) => {
        ws.subscribe(asset.assetId);
      });
    }

    ws.connect();

    return () => {
      unsubOpen();
      unsubClose();
      unsubMessage();
    };
  }, [assetsData]);

  // Merge initial prices with live updates
  const pricesData: LivePriceData[] = initialPrices?.prices || [];
  const mergedPrices = pricesData.map((price: LivePriceData) => {
    const liveUpdate = livePrices[price.assetId];
    return liveUpdate ? { ...price, sources: liveUpdate.sources } : price;
  });

  // Process oracle data for each asset
  const oracleData: AssetOracleData[] = assetsData?.map((asset) => {
    const priceData = mergedPrices.find((p: LivePriceData) => p.assetId === asset.assetId);

    if (!priceData || !priceData.sources) {
      return {
        assetId: asset.assetId,
        name: asset.name,
        symbol: asset.symbol,
        color: asset.color,
        sources: [],
        medianPrice: 0,
        allHealthy: false,
      };
    }

    const sources: OracleSource[] = [];

    // DIA
    if (priceData.sources.dia) {
      sources.push({
        name: 'DIA',
        price: priceData.sources.dia.price,
        timestamp: priceData.sources.dia.timestamp,
        isStale: priceData.sources.dia.status === 'stale' || isPriceStale(priceData.sources.dia.timestamp),
      });
    }

    // RedStone
    if (priceData.sources.redstone) {
      sources.push({
        name: 'RedStone',
        price: priceData.sources.redstone.price,
        timestamp: priceData.sources.redstone.timestamp,
        isStale: priceData.sources.redstone.status === 'stale' || isPriceStale(priceData.sources.redstone.timestamp),
      });
    }

    // Pyth
    if (priceData.sources.pyth) {
      sources.push({
        name: 'Pyth',
        price: priceData.sources.pyth.price,
        timestamp: priceData.sources.pyth.timestamp,
        isStale: priceData.sources.pyth.status === 'stale' || isPriceStale(priceData.sources.pyth.timestamp),
      });
    }

    // Calculate median price
    const prices = sources
      .filter((s) => !s.isStale)
      .map((s) => parseFloat(s.price))
      .sort((a, b) => a - b);
    const medianPrice =
      prices.length > 0
        ? prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)]
        : 0;

    const allHealthy = sources.length > 0 && sources.every((s) => !s.isStale);

    return {
      assetId: asset.assetId,
      name: asset.name,
      symbol: asset.symbol,
      color: asset.color,
      sources,
      medianPrice,
      allHealthy,
    };
  }) || [];

  const healthyAssets = oracleData.filter((d) => d.allHealthy).length;
  const totalAssets = oracleData.length;
  const healthPercent = totalAssets > 0 ? (healthyAssets / totalAssets) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Oracle Status</h2>
        <p className="text-muted-foreground">
          Real-time price feed monitoring and health checks
        </p>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WebSocket Status
            </CardTitle>
            <Radio className={`h-4 w-4 ${wsConnected ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <Badge variant={wsConnected ? 'default' : 'destructive'} className="text-base">
              {wsConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Healthy Assets
            </CardTitle>
            <Activity className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">
              {healthyAssets} / {totalAssets}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{healthPercent.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Oracle Data per Asset */}
      <div className="space-y-6">
        {oracleData.map((oracle) => (
          <Card key={oracle.assetId} className="premium-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${oracle.color}20` }}
                  >
                    <Activity className="h-5 w-5" style={{ color: oracle.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-display">{oracle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{oracle.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Median Price</p>
                  <p className="font-mono text-2xl font-semibold text-gold">
                    ${oracle.medianPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {oracle.sources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No oracle sources available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price (USD)</TableHead>
                      <TableHead className="text-right">Last Update</TableHead>
                      <TableHead className="text-right">Deviation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oracle.sources.map((source) => {
                      const price = parseFloat(source.price);
                      const deviation =
                        oracle.medianPrice > 0
                          ? ((price - oracle.medianPrice) / oracle.medianPrice) * 100
                          : 0;
                      const isDeviationHigh = Math.abs(deviation) > 2; // >2% deviation

                      return (
                        <TableRow key={source.name}>
                          <TableCell className="font-semibold">{source.name}</TableCell>
                          <TableCell>
                            {source.isStale ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Stale
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1 bg-success">
                                <CheckCircle className="h-3 w-3" />
                                Live
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-lg">
                            ${price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatRelativeTime(source.timestamp)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                isDeviationHigh
                                  ? 'text-warning border-warning'
                                  : 'text-muted-foreground'
                              }
                            >
                              {deviation > 0 ? '+' : ''}
                              {deviation.toFixed(2)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">Status Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div>
                <p className="font-semibold">Live</p>
                <p className="text-muted-foreground text-xs">Updated within last 2 minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="font-semibold">Stale</p>
                <p className="text-muted-foreground text-xs">No update for &gt;2 minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="font-semibold">High Deviation</p>
                <p className="text-muted-foreground text-xs">&gt;2% difference from median</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
