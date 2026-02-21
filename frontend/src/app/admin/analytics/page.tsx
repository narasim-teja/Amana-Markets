'use client';

/**
 * Analytics Page
 * Shows volume charts, fee stats, and top traders
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VolumeChart } from '@/components/charts/volume-chart';
import { apiClient } from '@/lib/api-client';
import { enrichAssetWithMetadata, type ApiAsset, getAssetMetadata } from '@/lib/assets';
import { formatCompactNumber, formatAED, shortenAddress } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  BarChart3,
} from 'lucide-react';

type Period = '24h' | '7d' | '30d';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('24h');

  // Fetch volume analytics
  // API returns: { period, volumeByAsset: [{ asset_id, trade_count, total_volume, buy_count, sell_count }] }
  const { data: volumeData, isLoading: volumeLoading } = useQuery({
    queryKey: ['volume', period],
    queryFn: () => apiClient.getVolumeAnalytics(period),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch fee analytics
  // API returns: { totalFees: string, feesByAsset: [{ asset_id, total_fees }] }
  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => apiClient.getFeeAnalytics(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch trader analytics
  // API returns: { stats: { unique_traders, total_trades }, topTraders: [{ trader, trade_count, total_volume }] }
  const { data: traderData } = useQuery({
    queryKey: ['traders'],
    queryFn: () => apiClient.getTraderAnalytics(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch assets for breakdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: ApiAsset) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Compute totals from volumeByAsset
  const volumeByAsset = volumeData?.volumeByAsset || [];
  const totalVolume = volumeByAsset.reduce(
    (sum: number, v: any) => sum + parseInt(v.total_volume || '0'),
    0
  );
  const totalTradeCount = volumeByAsset.reduce(
    (sum: number, v: any) => sum + (v.trade_count || 0),
    0
  );

  // Top traders from API
  const topTraders = traderData?.topTraders || [];
  const uniqueTraders = traderData?.stats?.unique_traders || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Trading volume, fees, and performance metrics
        </p>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="24h">24 Hours</TabsTrigger>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-8 mt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Volume"
              value={`${formatCompactNumber(totalVolume / 1e6)} DDSC`}
              icon={TrendingUp}
              loading={volumeLoading}
            />
            <StatsCard
              title="Trade Count"
              value={totalTradeCount.toString()}
              icon={Activity}
              loading={volumeLoading}
            />
            <StatsCard
              title="Total Fees"
              value={`${formatAED(feesData?.totalFees || '0')} DDSC`}
              icon={DollarSign}
              loading={feesLoading}
            />
            <StatsCard
              title="Unique Traders"
              value={uniqueTraders.toString()}
              icon={Users}
              loading={volumeLoading}
            />
          </div>

          {/* Volume Breakdown by Asset */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-display">Volume Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {assetsData?.map((asset) => {
                  const assetVolumeEntry = volumeByAsset.find(
                    (v: any) => v.asset_id === asset.assetId
                  );
                  const assetVolume = parseInt(assetVolumeEntry?.total_volume || '0');
                  const assetTradeCount = assetVolumeEntry?.trade_count || 0;
                  const volumePercent = totalVolume > 0
                    ? (assetVolume / totalVolume) * 100
                    : 0;

                  return (
                    <div
                      key={asset.assetId}
                      className="p-4 bg-dark-800/30 rounded-lg border border-dark-700"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${asset.color}20` }}
                        >
                          <Activity className="h-4 w-4" style={{ color: asset.color }} />
                        </div>
                        <div>
                          <h4 className="font-semibold">{asset.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            {asset.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Volume</span>
                          <span className="font-mono font-semibold">
                            {formatCompactNumber(assetVolume / 1e6)} DDSC
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Trades</span>
                          <span className="font-mono font-semibold">
                            {assetTradeCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Share</span>
                          <span className="font-mono font-semibold">
                            {volumePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Fee Collection Stats */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-display">Fee Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Total Fees (All Time)</p>
                  <p className="number-display">
                    {formatAED(feesData?.totalFees || '0')} DDSC
                  </p>
                </div>
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Avg Fee per Trade</p>
                  <p className="number-display">
                    {totalTradeCount > 0 && feesData?.totalFees
                      ? formatAED(
                          Math.floor(parseInt(feesData.totalFees) / totalTradeCount).toString()
                        )
                      : '0.00'}{' '}
                    DDSC
                  </p>
                </div>
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Fee Rate</p>
                  <p className="number-display">0.10%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Traders */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-display">Top Traders</CardTitle>
            </CardHeader>
            <CardContent>
              {topTraders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No trading data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Trades</TableHead>
                      <TableHead className="text-right">Volume (DDSC)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTraders.map((trader: any, index: number) => (
                      <TableRow key={trader.trader}>
                        <TableCell>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {shortenAddress(trader.trader)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {trader.trade_count}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCompactNumber(parseInt(trader.total_volume || '0') / 1e6)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}

function StatsCard({ title, value, icon: Icon, loading }: StatsCardProps) {
  return (
    <Card className="premium-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gold" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-dark-700 animate-pulse rounded" />
        ) : (
          <div className="number-display">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
