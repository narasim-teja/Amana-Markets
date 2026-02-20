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
import { enrichAssetWithMetadata } from '@/lib/assets';
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
  const { data: volumeData, isLoading: volumeLoading } = useQuery({
    queryKey: ['volume', period],
    queryFn: () => apiClient.getVolumeAnalytics(period),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch fee analytics
  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => apiClient.getFeeAnalytics(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch trades for top traders
  const { data: tradesData } = useQuery({
    queryKey: ['trades', 'analytics'],
    queryFn: () => apiClient.getTrades({ limit: 1000 }),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch assets for breakdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const assets = await apiClient.getAssets();
      return assets.map((asset: any) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Calculate top traders
  const topTraders = tradesData?.trades
    ? Object.entries(
        tradesData.trades.reduce((acc: any, trade: any) => {
          const trader = trade.trader;
          if (!acc[trader]) {
            acc[trader] = {
              address: trader,
              volume: 0,
              trades: 0,
              pnl: 0,
            };
          }
          acc[trader].volume += parseFloat(trade.stablecoin_amount);
          acc[trader].trades += 1;
          return acc;
        }, {})
      )
        .map(([_, data]) => data)
        .sort((a: any, b: any) => b.volume - a.volume)
        .slice(0, 10)
    : [];

  // Prepare volume chart data
  const volumeChartData = volumeData?.history
    ? volumeData.history.map((item: any) => ({
        time: new Date(item.date).getTime() / 1000,
        value: parseFloat(item.volume) / 1e6, // Convert to mAED
      }))
    : [];

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
              value={`${formatCompactNumber(parseFloat(volumeData?.totalVolume || '0') / 1e6)} mAED`}
              icon={TrendingUp}
              loading={volumeLoading}
            />
            <StatsCard
              title="Trade Count"
              value={volumeData?.tradeCount?.toString() || '0'}
              icon={Activity}
              loading={volumeLoading}
            />
            <StatsCard
              title="Total Fees"
              value={`${formatAED(parseFloat(feesData?.total || '0'))} mAED`}
              icon={DollarSign}
              loading={feesLoading}
            />
            <StatsCard
              title="Unique Traders"
              value={volumeData?.uniqueTraders?.toString() || '0'}
              icon={Users}
              loading={volumeLoading}
            />
          </div>

          {/* Volume Chart */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-gold" />
                Volume Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {volumeChartData.length > 0 ? (
                <VolumeChart data={volumeChartData} height={350} />
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  <p>No volume data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Breakdown by Asset */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-xl font-display">Volume Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {assetsData?.map((asset: any) => {
                  const assetVolume =
                    volumeData?.byAsset?.find((v: any) => v.assetId === asset.assetId)
                      ?.volume || '0';
                  const volumePercent = volumeData?.totalVolume
                    ? (parseFloat(assetVolume) / parseFloat(volumeData.totalVolume)) * 100
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
                            {formatCompactNumber(parseFloat(assetVolume) / 1e6)} mAED
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
                    {formatAED(parseFloat(feesData?.total || '0'))} mAED
                  </p>
                </div>
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Avg Fee per Trade</p>
                  <p className="number-display">
                    {volumeData?.tradeCount && feesData?.total
                      ? formatAED(
                          parseFloat(feesData.total) / volumeData.tradeCount
                        )
                      : '0.00'}{' '}
                    mAED
                  </p>
                </div>
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Fee Rate</p>
                  <p className="number-display">
                    {feesData?.feeRate
                      ? `${(parseFloat(feesData.feeRate) * 100).toFixed(3)}%`
                      : '0.10%'}
                  </p>
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
                      <TableHead className="text-right">Volume (mAED)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTraders.map((trader: any, index: number) => (
                      <TableRow key={trader.address}>
                        <TableCell>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {shortenAddress(trader.address)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {trader.trades}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCompactNumber(trader.volume / 1e6)}
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
