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
} from 'lucide-react';

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
    refetchInterval: REFETCH_INTERVAL_FAST,
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

      {/* Oracle Status */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Oracle Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {livePrices?.prices?.map((price: any) => (
              <div key={price.assetId} className="p-4 bg-dark-800/30 rounded-lg">
                <h4 className="font-semibold mb-3">{price.name}</h4>
                <div className="space-y-2">
                  {price.sources?.dia && (
                    <OracleSourceStatus
                      name="DIA"
                      price={price.sources.dia.price}
                      timestamp={price.sources.dia.timestamp}
                    />
                  )}
                  {price.sources?.redstone && (
                    <OracleSourceStatus
                      name="RedStone"
                      price={price.sources.redstone.price}
                      timestamp={price.sources.redstone.timestamp}
                    />
                  )}
                  {price.sources?.pyth && (
                    <OracleSourceStatus
                      name="Pyth"
                      price={price.sources.pyth.price}
                      timestamp={price.sources.pyth.timestamp}
                    />
                  )}
                </div>
              </div>
            ))}
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
          title="Oracle Status"
          description="Monitor price feed health"
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
}

function OracleSourceStatus({ name, price, timestamp }: OracleSourceStatusProps) {
  const isStale = isPriceStale(timestamp);

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {isStale ? (
          <XCircle className="h-3 w-3 text-destructive" />
        ) : (
          <CheckCircle className="h-3 w-3 text-success" />
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
