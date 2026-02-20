'use client';

/**
 * Admin Overview Dashboard
 * Shows key metrics, live trade feed, vault health, oracle status
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api-client';
import { getAssetMetadata } from '@/lib/assets';
import { formatCompactNumber, formatAED, formatRelativeTime, isPriceStale, shortenAddress } from '@/lib/format';
import { REFETCH_INTERVAL_FAST, REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminOverviewPage() {
  // Fetch vault stats
  const { data: vaultStats, isLoading: vaultLoading } = useQuery({
    queryKey: ['vaultStats'],
    queryFn: () => apiClient.getVaultStats(),
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
          Real-time monitoring and control center for ADI Commodities Marketplace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Value Locked"
          value={`${formatCompactNumber(parseFloat(vaultStats?.totalAssets || '0') / 1e6)} mAED`}
          icon={DollarSign}
          loading={vaultLoading}
        />
        <StatsCard
          title="24h Volume"
          value={`${formatCompactNumber(totalVolume / 1e6)} mAED`}
          change="+12.5%"
          changeType="positive"
          icon={TrendingUp}
          loading={volumeLoading}
        />
        <StatsCard
          title="Total Fees Collected"
          value={`${formatAED(feesData?.totalFees || '0')} mAED`}
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

      {/* Vault Utilization */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Vault Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress
                value={vaultStats?.utilization || 0}
                className="h-4"
              />
            </div>
            <span className="font-mono text-lg font-semibold text-gold min-w-[80px] text-right">
              {vaultStats?.utilization?.toFixed(2) || '0.00'}%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Assets</p>
              <p className="font-mono font-semibold">
                {formatCompactNumber(parseFloat(vaultStats?.totalAssets || '0') / 1e6)} mAED
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Utilization</p>
              <p className="font-mono font-semibold">
                {vaultStats?.utilization?.toFixed(2) || '0.00'}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available</p>
              <p className="font-mono font-semibold">
                {formatCompactNumber(parseFloat(vaultStats?.availableLiquidity || '0') / 1e6)} mAED
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
                        {formatCompactNumber(parseFloat(trade.stablecoin_amount) / 1e6)} mAED
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-display">Oracle Status</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5',
                  healthySources === totalSources && totalSources > 0
                    ? 'border-emerald-500/30 text-emerald-400'
                    : healthySources > 0
                      ? 'border-yellow-500/30 text-yellow-400'
                      : 'border-red-500/30 text-red-400'
                )}
              >
                <Zap className="h-3 w-3" />
                {healthySources}/{totalSources} Sources Active
              </Badge>
              <Badge variant="outline" className="gap-1.5 border-dark-600 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Relayer: 20min cycle
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {oraclePrices.map((price: any) => {
              const sources = [];
              if (price.sources?.pyth) sources.push({ name: 'Pyth', ...price.sources.pyth });
              if (price.sources?.dia) sources.push({ name: 'DIA', ...price.sources.dia });
              if (price.sources?.redstone) sources.push({ name: 'RedStone', ...price.sources.redstone });

              const activeCount = sources.filter((s) => s.status === 'ok').length;
              const medianPrice = price.median ? parseFloat(price.median) : 0;

              return (
                <div key={price.assetId} className="p-4 bg-dark-800/30 rounded-lg space-y-3">
                  {/* Asset Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{price.name}</h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        activeCount === sources.length
                          ? 'border-emerald-500/30 text-emerald-400'
                          : activeCount > 0
                            ? 'border-yellow-500/30 text-yellow-400'
                            : 'border-red-500/30 text-red-400'
                      )}
                    >
                      {activeCount}/{sources.length}
                    </Badge>
                  </div>

                  {/* Median Price */}
                  <div className="text-center py-2 bg-dark-900/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-0.5">Median</p>
                    <p className="font-mono text-lg font-bold text-gold">
                      ${medianPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {price.lastUpdated > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(price.lastUpdated)}
                      </p>
                    )}
                  </div>

                  {/* Sources */}
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <OracleSourceStatus
                        key={source.name}
                        name={source.name}
                        price={source.price}
                        timestamp={source.timestamp}
                        status={source.status}
                      />
                    ))}
                    {sources.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No sources</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Staleness Info */}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t border-dark-700 pt-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span>Fresh ({"<"}24h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span>Stale ({">"}24h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-400" />
              <span>Error</span>
            </div>
            <span className="ml-auto">On-chain staleness: 24h | Relayer cycle: 20min</span>
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

interface OracleSourceStatusProps {
  name: string;
  price: string;
  timestamp: number;
  status: string;
}

function OracleSourceStatus({ name, price, timestamp, status }: OracleSourceStatusProps) {
  const isOk = status === 'ok';
  const isError = status === 'error';

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {isError ? (
          <XCircle className="h-3 w-3 text-red-400" />
        ) : isOk ? (
          <CheckCircle className="h-3 w-3 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-3 w-3 text-yellow-400" />
        )}
        <span className="text-muted-foreground">{name}</span>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs">${parseFloat(price).toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(timestamp)}</p>
      </div>
    </div>
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
