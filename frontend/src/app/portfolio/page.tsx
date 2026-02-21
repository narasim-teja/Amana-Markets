'use client';

/**
 * Portfolio Page
 * View all holdings, PnL, and trade history
 */

import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { enrichAssetWithMetadata, type ApiAsset, type AssetMetadata, getAssetMetadata } from '@/lib/assets';
import type { Trade } from '@/types/api';
import { usePosition } from '@/hooks/api/use-position';
import { useLivePrice } from '@/hooks/api/use-prices';
import {
  formatAED,
  formatCommodityPrice,
  formatCompactNumber,
  formatRelativeTime,
} from '@/lib/format';
import { formatUnits } from 'viem';
import { REFETCH_INTERVAL_FAST, REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Wallet,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function PortfolioPage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  // Fetch assets
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: ApiAsset) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch user trade history
  const { data: tradesData } = useQuery({
    queryKey: ['trades', walletAddress],
    queryFn: () => apiClient.getUserTrades(walletAddress!, 50),
    enabled: !!walletAddress,
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  const assets = assetsData || [];

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-display text-gold mb-4">View Your Portfolio</h2>
          <p className="text-muted-foreground mb-8">
            Connect your account to see your holdings and trade history
          </p>
          <Button onClick={login} size="lg" className="btn-gold">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Account
          </Button>
        </div>
      </div>
    );
  }

  const userTrades = tradesData?.trades || [];
  const totalVolume = userTrades.reduce(
    (sum: number, trade: Trade) => sum + parseFloat(trade.stablecoin_amount),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Portfolio</h2>
        <p className="text-muted-foreground font-mono">{walletAddress}</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
            <Activity className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{userTrades.length}</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Volume
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">
              {formatCompactNumber(totalVolume / 1e6)} DDSC
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfolio Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">&mdash;</div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <HoldingsTable assets={assets} />
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          {userTrades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trades yet</p>
              <p className="text-sm mt-2">Start trading to build your history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value (DDSC)</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userTrades.map((trade: Trade) => {
                  const isBuy = !!trade.is_buy;
                  const assetMeta = getAssetMetadata(trade.asset_id);
                  const assetLabel = assetMeta?.name || assetMeta?.symbol || 'Unknown';

                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">
                        {assetLabel}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isBuy ? 'default' : 'destructive'}
                          className="gap-1"
                        >
                          {isBuy ? (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              Buy
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="h-3 w-3" />
                              Sell
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCommodityPrice(trade.token_amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAED(trade.stablecoin_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatRelativeTime(trade.timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HoldingsTable({ assets }: { assets: AssetMetadata[] }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No assets available</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead className="text-right">Holdings</TableHead>
          <TableHead className="text-right">Cost Basis (DDSC)</TableHead>
          <TableHead className="text-right">Market Value (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <HoldingRow key={asset.assetId} asset={asset} />
        ))}
      </TableBody>
    </Table>
  );
}

function HoldingRow({ asset }: { asset: AssetMetadata }) {
  const { data: position } = usePosition(asset.assetId, asset.tokenAddress || null);
  const { price: livePrice } = useLivePrice(asset.assetId);

  const hasPosition = position && parseFloat(position.commodityBalance) > 0;
  // median is already formatted as USD string e.g. "5073.23000000"
  const oraclePrice = livePrice?.median ? parseFloat(livePrice.median) : 0;
  const holdings = hasPosition ? parseFloat(formatUnits(BigInt(position.commodityBalance), 18)) : 0;
  const currentValueUsd = holdings * oraclePrice;

  if (!hasPosition) {
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${asset.color}20` }}
            >
              <Activity className="h-4 w-4" style={{ color: asset.color }} />
            </div>
            <div>
              <p className="font-medium">{asset.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{asset.tokenSymbol}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right text-muted-foreground">&mdash;</TableCell>
        <TableCell className="text-right text-muted-foreground">&mdash;</TableCell>
        <TableCell className="text-right text-muted-foreground">&mdash;</TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${asset.color}20` }}
          >
            <Activity className="h-4 w-4" style={{ color: asset.color }} />
          </div>
          <div>
            <p className="font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{asset.tokenSymbol}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCommodityPrice(position.commodityBalance)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatAED(position.costBasis)}
      </TableCell>
      <TableCell className="text-right font-mono">
        {oraclePrice > 0 ? `$${currentValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '\u2014'}
      </TableCell>
    </TableRow>
  );
}
