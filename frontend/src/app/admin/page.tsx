'use client';

/**
 * Admin Overview Dashboard
 * Shows key metrics, live trade feed, treasury health, price feed status
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api-client';
import { getAssetMetadata } from '@/lib/assets';
import { formatCompactNumber, formatAED, formatRelativeTime, shortenAddress } from '@/lib/format';
import { REFETCH_INTERVAL_FAST, REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/components/branding-provider';

export default function AdminOverviewPage() {
  const { appName } = useBranding();

  // Fetch treasury stats
  const { data: treasuryStats, isLoading: treasuryLoading } = useQuery({
    queryKey: ['treasuryStats'],
    queryFn: () => apiClient.getTreasuryStats(),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch 24h volume
  const { data: volumeData, isLoading: volumeLoading } = useQuery({
    queryKey: ['volume', '24h'],
    queryFn: () => apiClient.getVolumeAnalytics('24h'),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch fees
  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => apiClient.getFeeAnalytics(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch recent trades
  const { data: tradesData } = useQuery({
    queryKey: ['trades', 'recent'],
    queryFn: () => apiClient.getTrades({ limit: 10 }),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch live prices for oracle status
  const { data: livePrices } = useQuery({
    queryKey: ['prices', 'live'],
    queryFn: () => apiClient.getLivePrices(),
    refetchInterval: 60_000, // Poll every 60s
  });

  // Compute totals from volumeByAsset
  const volumeByAsset = volumeData?.volumeByAsset || [];
  const totalVolume = volumeByAsset.reduce(
    (sum: number, v: { total_volume?: string }) => sum + parseInt(v.total_volume || '0'),
    0
  );
  const totalTradeCount = volumeByAsset.reduce(
    (sum: number, v: { trade_count?: number }) => sum + (v.trade_count || 0),
    0
  );

  // Oracle health summary
  const oraclePrices = livePrices?.prices || [];
  const totalSources = oraclePrices.reduce((sum: number, p: any) => {
    let count = 0;
    if (p.sources?.pyth) count++;
    if (p.sources?.dia) count++;
    if (p.sources?.redstone) count++;
    return sum + count;
  }, 0);
  const healthySources = oraclePrices.reduce((sum: number, p: any) => {
    let count = 0;
    if (p.sources?.pyth?.status === 'ok') count++;
    if (p.sources?.dia?.status === 'ok') count++;
    if (p.sources?.redstone?.status === 'ok') count++;
    return sum + count;
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Real-time monitoring and control center for {appName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Reserves"
          value={`${formatCompactNumber(parseFloat(treasuryStats?.totalAssets || '0') / 1e6)} DDSC`}
          icon={DollarSign}
          loading={treasuryLoading}
        />
        <StatsCard
          title="24h Volume"
          value={`${formatCompactNumber(totalVolume / 1e6)} DDSC`}
          change="+12.5%"
          changeType="positive"
          icon={TrendingUp}
          loading={volumeLoading}
        />
        <StatsCard
          title="Total Fees Collected"
          value={`${formatAED(feesData?.totalFees || '0')} DDSC`}
          icon={Activity}
          loading={feesLoading}
        />
        <StatsCard
          title="Total Trades"
          value={totalTradeCount.toString()}
          icon={Users}
          loading={volumeLoading}
        />
      </div>

      {/* Capital Utilization */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Capital Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress
                value={(treasuryStats?.utilization || 0) / 100}
                className="h-4"
              />
            </div>
            <span className="font-mono text-lg font-semibold text-gold min-w-[80px] text-right">
              {((treasuryStats?.utilization || 0) / 100).toFixed(2)}%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Reserves</p>
              <p className="font-mono font-semibold">
                {formatCompactNumber(parseFloat(treasuryStats?.totalAssets || '0') / 1e6)} DDSC
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Utilization</p>
              <p className="font-mono font-semibold">
                {((treasuryStats?.utilization || 0) / 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available</p>
              <p className="font-mono font-semibold">
                {formatCompactNumber(parseFloat(treasuryStats?.availableLiquidity || '0') / 1e6)} DDSC
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Trade Feed */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Live Trade Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {tradesData?.trades?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trades yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tradesData?.trades?.slice(0, 5).map((trade: any) => {
                const isBuy = !!trade.is_buy;
                const assetMeta = getAssetMetadata(trade.asset_id);
                const assetLabel = assetMeta?.symbol || shortenAddress(trade.asset_id);

                return (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={isBuy ? 'default' : 'destructive'}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{assetLabel}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {shortenAddress(trade.trader)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">
                        {formatCompactNumber(parseFloat(trade.stablecoin_amount) / 1e6)} DDSC
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(trade.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oracle Status - Enhanced */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Price Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {oraclePrices.map((price: any) => {
              const sources = [];
              if (price.sources?.pyth) sources.push({ name: 'Pyth', ...price.sources.pyth });
              if (price.sources?.dia) sources.push({ name: 'DIA', ...price.sources.dia });
              if (price.sources?.redstone) sources.push({ name: 'RedStone', ...price.sources.redstone });

              // Pick the best source: prefer active (ok), then most recent timestamp
              const bestSource = sources
                .sort((a, b) => {
                  if (a.status === 'ok' && b.status !== 'ok') return -1;
                  if (b.status === 'ok' && a.status !== 'ok') return 1;
                  return (b.timestamp || 0) - (a.timestamp || 0);
                })[0] || null;

              const medianPrice = price.median ? parseFloat(price.median) : 0;
              const isActive = bestSource?.status === 'ok';

              return (
                <div key={price.assetId} className="p-4 bg-dark-800/30 rounded-lg space-y-3">
                  {/* Asset Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{price.name}</h4>
                    {bestSource ? (
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                        <span className={cn(
                          'text-xs',
                          isActive ? 'text-emerald-400' : 'text-yellow-400'
                        )}>
                          {bestSource.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3 w-3 text-red-400" />
                        <span className="text-xs text-red-400">Offline</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-center py-2 bg-dark-900/50 rounded-lg">
                    <p className="font-mono text-lg font-bold text-gold">
                      ${medianPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {price.lastUpdated > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(price.lastUpdated)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t border-dark-700 pt-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span>Stale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-400" />
              <span>Offline</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          href="/admin/users"
          icon={Users}
          title="Manage Users"
          description="Whitelist or blacklist addresses"
        />
        <QuickActionCard
          href="/admin/assets"
          icon={Activity}
          title="Control Assets"
          description="Pause trading, adjust spreads"
        />
        <QuickActionCard
          href="/admin/oracle"
          icon={TrendingUp}
          title="Oracle Details"
          description="Detailed price feed monitoring"
        />
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  loading?: boolean;
}

function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  loading,
}: StatsCardProps) {
  const changeColorClass = {
    positive: 'text-success bg-success/10',
    negative: 'text-destructive bg-destructive/10',
    neutral: 'text-muted-foreground bg-muted/10',
  }[changeType];

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
          <>
            <div className="number-display">{value}</div>
            {change && (
              <Badge variant="outline" className={`mt-2 ${changeColorClass}`}>
                {change}
              </Badge>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

function QuickActionCard({ href, icon: Icon, title, description }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="premium-card text-center hover:border-gold/50 transition-all cursor-pointer block"
    >
      <Icon className="h-8 w-8 text-gold mx-auto mb-2" />
      <h4 className="font-display font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </a>
  );
}
