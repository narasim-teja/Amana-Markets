'use client';

/**
 * Treasury Dashboard
 * Monitor treasury health, capital utilization, and positions
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { enrichAssetWithMetadata, type ApiAsset, getAssetMetadata } from '@/lib/assets';
import { formatCompactNumber, formatAED, shortenAddress } from '@/lib/format';
import { REFETCH_INTERVAL_FAST } from '@/lib/constants';
import {
  Landmark,
  TrendingUp,
  Shield,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { Trade } from '@/types/api';

export default function TreasuryDashboardPage() {
  // Fetch treasury stats
  // API returns: { totalAssets, utilization, availableLiquidity }
  const { data: treasuryStats, isLoading: treasuryLoading } = useQuery({
    queryKey: ['treasuryStats'],
    queryFn: () => apiClient.getTreasuryStats(),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch treasury exposure separately
  // API returns: { totalExposure, assetExposures: [{ asset_id, asset_exposure }] }
  const { data: exposureData } = useQuery({
    queryKey: ['treasuryExposure'],
    queryFn: () => apiClient.getTreasuryExposure(),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch assets for exposure breakdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: ApiAsset) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch trades to get treasury activity
  const { data: tradesData } = useQuery({
    queryKey: ['trades', 'recent'],
    queryFn: () => apiClient.getTrades({ limit: 100 }),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  const utilization = treasuryStats?.utilization || 0;
  const isHealthy = utilization < 80;
  const isWarning = utilization >= 80 && utilization < 90;
  const isDanger = utilization >= 90;

  const totalAssets = parseFloat(treasuryStats?.totalAssets || '0') / 1e6;
  const totalExposure = parseFloat(exposureData?.totalExposure || '0') / 1e6;
  const availableCapital = parseFloat(treasuryStats?.availableLiquidity || '0') / 1e6;
  const reservePercent = totalAssets > 0 ? (availableCapital / totalAssets) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Treasury Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor treasury health and exposure limits
        </p>
      </div>

      {/* Health Status Banner */}
      <Card
        className={`premium-card ${
          isDanger
            ? 'border-destructive'
            : isWarning
            ? 'border-warning'
            : 'border-success'
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {isHealthy ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <AlertTriangle
                className={`h-8 w-8 ${isDanger ? 'text-destructive' : 'text-warning'}`}
              />
            )}
            <div>
              <h3 className="text-xl font-display mb-1">
                Treasury Status:{' '}
                {isHealthy ? 'Healthy' : isWarning ? 'Warning' : 'Critical'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isHealthy
                  ? 'Capital utilization is within safe limits'
                  : isWarning
                  ? 'Approaching maximum capital utilization'
                  : 'Capital utilization critically high - consider pausing risky assets'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Reserves"
          value={`${formatCompactNumber(totalAssets)} DDSC`}
          icon={DollarSign}
          loading={treasuryLoading}
        />
        <MetricCard
          title="Total Exposure"
          value={`${formatCompactNumber(totalExposure)} DDSC`}
          icon={TrendingUp}
          loading={treasuryLoading}
        />
        <MetricCard
          title="Available Capital"
          value={`${formatCompactNumber(availableCapital)} DDSC`}
          icon={Landmark}
          loading={treasuryLoading}
        />
        <MetricCard
          title="Reserve Ratio"
          value={`${reservePercent.toFixed(2)}%`}
          icon={Shield}
          loading={treasuryLoading}
        />
      </div>

      {/* Utilization Gauge */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Capital Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress
                  value={utilization}
                  className="h-6"
                />
              </div>
              <span className="font-mono text-2xl font-semibold text-gold min-w-[100px] text-right">
                {utilization.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-700">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Safe Limit</p>
                <Badge variant="outline" className="text-success border-success">
                  &lt; 80%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Warning Zone</p>
                <Badge variant="outline" className="text-warning border-warning">
                  80-90%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical</p>
                <Badge variant="outline" className="text-destructive border-destructive">
                  &gt; 90%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Exposure Breakdown */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Asset Exposure Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {assetsData?.map((asset) => {
              // Look up exposure from the exposure API data
              const assetExposureEntry = exposureData?.assetExposures?.find(
                (e: { asset_id: string; asset_exposure: string }) => e.asset_id === asset.assetId
              );
              const exposure = parseFloat(assetExposureEntry?.asset_exposure || asset.exposure || '0') / 1e6;
              const maxExposure = parseFloat(asset.maxExposure || '0') / 1e6;
              const exposurePercent = maxExposure > 0 ? (exposure / maxExposure) * 100 : 0;
              const treasuryPercent = totalAssets > 0 ? (exposure / totalAssets) * 100 : 0;

              return (
                <div key={asset.assetId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${asset.color}20` }}
                      >
                        <Activity className="h-4 w-4" style={{ color: asset.color }} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{asset.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatCompactNumber(exposure)} / {formatCompactNumber(maxExposure)} DDSC
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={exposurePercent > 80 ? 'destructive' : 'outline'}
                        className="mb-1"
                      >
                        {exposurePercent.toFixed(1)}%
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {treasuryPercent.toFixed(1)}% of treasury
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={exposurePercent}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Capital Positions */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Capital Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Capital position tracking coming soon</p>
            <p className="text-sm mt-2">
              Contract events will be indexed to show individual capital deposits and shares
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Activity */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Recent Treasury Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tradesData?.trades?.slice(0, 5).map((trade: Trade) => {
              const isBuy = !!trade.is_buy;
              const action = isBuy ? 'Bought' : 'Sold';
              const color = isBuy ? 'text-success' : 'text-destructive';
              // Look up asset symbol from metadata
              const assetMeta = getAssetMetadata(trade.asset_id);
              const assetLabel = assetMeta?.symbol || shortenAddress(trade.asset_id);

              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={isBuy ? 'default' : 'destructive'} className="min-w-[60px]">
                      {action}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{assetLabel}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {shortenAddress(trade.trader)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-semibold ${color}`}>
                      {isBuy ? '+' : '-'}
                      {formatCompactNumber(parseFloat(trade.stablecoin_amount) / 1e6)} DDSC
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}

function MetricCard({ title, value, icon: Icon, loading }: MetricCardProps) {
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
