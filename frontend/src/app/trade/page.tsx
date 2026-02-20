'use client';

/**
 * Trading View Page
 * Professional trading interface for buying/selling commodity tokens
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  enrichAssetWithMetadata,
  type AssetMetadata,
  type ApiAsset,
} from '@/lib/assets';
import { useLivePrice } from '@/hooks/api/use-prices';
import { useQuote } from '@/hooks/api/use-quote';
import { usePosition } from '@/hooks/api/use-position';
import { useUserStatus } from '@/hooks/blockchain/use-user-status';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { useMaedBalance } from '@/hooks/blockchain/use-maed-balance';
import { CONTRACTS } from '@/lib/contracts';
import {
  formatAED,
  formatCommodityPrice,
  formatRelativeTime,
  isPriceStale,
} from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Radio,
  Wallet,
  AlertCircle,
  CheckCircle,
  ArrowDown,
  Coins,
  BarChart3,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits, parseUnits } from 'viem';
import { cn } from '@/lib/utils';
import { MintMaedDialog } from '@/components/mint-maed-dialog';

type TradeMode = 'buy' | 'sell';

export default function TradePage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');
  const [mintDialogOpen, setMintDialogOpen] = useState(false);

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

  const assets: AssetMetadata[] = assetsData || [];
  const selectedAsset = assets.find((a) => a.assetId === selectedAssetId);

  // Set default asset if none selected
  if (assets.length > 0 && !selectedAssetId) {
    setSelectedAssetId(assets[0].assetId);
  }

  // Fetch live price
  const { price: livePrice, isConnected: wsConnected } =
    useLivePrice(selectedAssetId);

  // Get quote
  const quote = useQuote(selectedAssetId, mode === 'buy', amount);

  // Get user position
  const { data: position } = usePosition(
    selectedAssetId,
    selectedAsset?.tokenAddress || null
  );

  // Check user status
  const { data: userStatus } = useUserStatus();

  // Contract write hook
  const { writeContract: executeTrade, isLoading: isTrading } =
    useContractWrite();

  // mAED balance
  const { balance: maedBalance, isLoading: maedLoading } = useMaedBalance();

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-display text-gold mb-4">
            Connect Wallet to Trade
          </h2>
          <p className="text-muted-foreground mb-8">
            Access premium commodity trading on the ADI blockchain
          </p>
          <Button onClick={login} size="lg" className="btn-gold">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!userStatus?.canTrade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="premium-card max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-xl font-display">KYC Required</h3>
            </div>
            {userStatus?.isBlacklisted ? (
              <p className="text-muted-foreground">
                Your address has been blacklisted and cannot trade on this
                platform.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Your address must be whitelisted to trade commodities. Please
                  contact our compliance team to complete KYC verification.
                </p>
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-sm font-mono text-gold break-all">
                    {wallet?.address}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleTrade = async () => {
    if (!selectedAssetId || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!quote.outputAmount || quote.outputAmount === BigInt(0)) {
      toast.error('Failed to get quote');
      return;
    }

    try {
      if (mode === 'buy') {
        // Buy: amount is mAED (6 decimals)
        const amountWei = parseUnits(amount, 6);
        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'buy',
          args: [selectedAssetId, amountWei],
        });
      } else {
        // Sell: amount is commodity tokens (8 decimals)
        const amountWei = parseUnits(amount, 8);
        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'sell',
          args: [selectedAssetId, amountWei],
        });
      }

      setAmount('');
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  const medianPrice = livePrice?.median ? parseFloat(livePrice.median) : 0;
  const isStale = livePrice?.lastUpdated
    ? isPriceStale(livePrice.lastUpdated)
    : true;
  const hasPosition = position && parseFloat(position.commodityBalance) > 0;

  // Buy: outputAmount is tokensOut (8 dec). Sell: outputAmount is stablecoinOut (6 dec).
  const outputFormatted =
    quote.outputAmount > BigInt(0)
      ? mode === 'buy'
        ? parseFloat(formatUnits(quote.outputAmount, 8)).toFixed(4)
        : parseFloat(formatUnits(quote.outputAmount, 6)).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-gold mb-1">Trade</h2>
          <p className="text-sm text-muted-foreground">
            Buy and sell tokenized commodities with real-time oracle pricing
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 px-3 py-1 w-fit',
            wsConnected
              ? 'border-emerald-500/30 text-emerald-400'
              : 'border-dark-600 text-muted-foreground'
          )}
        >
          <Radio
            className={cn(
              'h-3 w-3',
              wsConnected && 'text-emerald-400 animate-pulse'
            )}
          />
          {wsConnected ? 'Live' : 'Disconnected'}
        </Badge>
      </div>

      {/* Asset Selector Chips */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {assets.map((asset) => {
          const isSelected = asset.assetId === selectedAssetId;
          return (
            <button
              key={asset.assetId}
              onClick={() => {
                setSelectedAssetId(asset.assetId);
                setAmount('');
              }}
              className={cn(
                'flex items-center gap-3 px-5 py-3 rounded-xl border transition-all whitespace-nowrap min-w-fit',
                isSelected
                  ? 'border-gold/50 bg-gold/10 shadow-glow-gold'
                  : 'border-dark-700 bg-dark-900/50 hover:border-dark-600 hover:bg-dark-800/50'
              )}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${asset.color}20` }}
              >
                <Activity
                  className="h-4 w-4"
                  style={{ color: asset.color }}
                />
              </div>
              <div className="text-left">
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'text-gold' : 'text-foreground'
                  )}
                >
                  {asset.name}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {asset.tokenSymbol}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Price + Balance + Position */}
        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
          {/* Live Price */}
          {selectedAsset && (
            <div className="premium-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Market Price
                </span>
                <Badge
                  variant={isStale ? 'destructive' : 'default'}
                  className="text-xs gap-1"
                >
                  {isStale ? (
                    <>
                      <AlertCircle className="h-3 w-3" /> Stale
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3" /> Live
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono text-4xl font-bold text-foreground">
                  $
                  {medianPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedAsset.name} / USD</span>
                {livePrice && (
                  <>
                    <span className="text-dark-600">|</span>
                    <span>{formatRelativeTime(livePrice.lastUpdated)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Wallet Balance */}
          <div className="premium-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Your Balance
                </span>
              </div>
              <button
                onClick={() => setMintDialogOpen(true)}
                className="text-xs font-medium text-gold hover:text-gold-light transition-colors flex items-center gap-1 cursor-pointer"
              >
                + Buy mAED
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">mAED</span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {maedLoading ? '...' : maedBalance}
                </span>
              </div>
              {hasPosition && selectedAsset && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedAsset.tokenSymbol}
                  </span>
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {formatCommodityPrice(position.commodityBalance)}
                  </span>
                </div>
              )}
              <Button
                onClick={() => setMintDialogOpen(true)}
                variant="outline"
                className="w-full mt-1 border-gold/30 text-gold hover:bg-gold/10 hover:text-gold-light cursor-pointer"
                size="sm"
              >
                <Coins className="h-3.5 w-3.5 mr-1.5" />
                Buy mAED
              </Button>
            </div>
          </div>

          {/* Position */}
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Your Position
              </span>
            </div>
            {hasPosition && selectedAsset ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Holdings
                  </div>
                  <div className="font-mono text-2xl font-bold">
                    {formatCommodityPrice(position.commodityBalance)}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {selectedAsset.tokenSymbol}
                    </span>
                  </div>
                </div>
                <div className="h-px bg-dark-700" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Cost Basis
                    </div>
                    <div className="font-mono text-sm font-semibold">
                      {formatAED(position.costBasis)} mAED
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Mkt Value
                    </div>
                    <div className="font-mono text-sm font-semibold">
                      {medianPrice > 0
                        ? `$${(
                            parseFloat(
                              formatUnits(BigInt(position.commodityBalance), 8)
                            ) * medianPrice
                          ).toFixed(2)}`
                        : '--'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No position yet</p>
                <p className="text-xs mt-1 opacity-60">
                  Buy to start building a position
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Trading Form */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="premium-card">
            {/* Buy / Sell Toggle */}
            <div className="flex rounded-xl bg-dark-900 p-1 mb-6">
              <button
                onClick={() => setMode('buy')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all',
                  mode === 'buy'
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all',
                  mode === 'sell'
                    ? 'bg-red-500/15 text-red-400 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TrendingDown className="h-4 w-4" />
                Sell
              </button>
            </div>

            {/* Trade Form */}
            <div className="space-y-4">
              {/* TOP INPUT — what the user types */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {mode === 'buy' ? 'You pay' : 'You sell'}
                  </span>
                  {mode === 'buy' && (
                    <span className="text-xs text-muted-foreground">
                      Balance: {maedLoading ? '...' : maedBalance} mAED
                    </span>
                  )}
                  {mode === 'sell' && hasPosition && selectedAsset && (
                    <button
                      onClick={() =>
                        setAmount(
                          formatUnits(BigInt(position.commodityBalance), 8)
                        )
                      }
                      className="text-xs text-gold hover:text-gold-light transition-colors cursor-pointer"
                    >
                      Max: {formatCommodityPrice(position.commodityBalance)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step={mode === 'buy' ? '1' : '0.01'}
                    min="0"
                    className="text-2xl font-mono h-16 pr-36 bg-dark-900 border-dark-700 focus:border-gold/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {mode === 'buy' ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                          <Coins className="h-3 w-3 text-gold" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          mAED
                        </span>
                      </>
                    ) : (
                      selectedAsset && (
                        <>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${selectedAsset.color}20`,
                            }}
                          >
                            <Activity
                              className="h-3 w-3"
                              style={{ color: selectedAsset.color }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {selectedAsset.tokenSymbol}
                          </span>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow Separator */}
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* BOTTOM — computed output (read-only) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    You receive
                  </span>
                </div>
                <div className="relative">
                  <div className="h-16 flex items-center px-4 bg-dark-900 border border-dark-700 rounded-md">
                    <span
                      className={cn(
                        'text-2xl font-mono',
                        outputFormatted
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {quote.isLoading
                        ? '...'
                        : quote.error
                          ? 'Error'
                          : outputFormatted ?? '0.00'}
                    </span>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {mode === 'buy' ? (
                      selectedAsset && (
                        <>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${selectedAsset.color}20`,
                            }}
                          >
                            <Activity
                              className="h-3 w-3"
                              style={{ color: selectedAsset.color }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {selectedAsset.tokenSymbol}
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                          <Coins className="h-3 w-3 text-gold" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          mAED
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quote Details */}
              {amount && parseFloat(amount) > 0 && outputFormatted && (
                <div className="bg-dark-900/60 rounded-xl p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Rate</span>
                    <span className="font-mono text-foreground">
                      1 {selectedAsset?.tokenSymbol} ={' '}
                      {medianPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      mAED
                    </span>
                  </div>
                  {quote.spreadBps > BigInt(0) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spread</span>
                      <span className="font-mono text-foreground">
                        {(Number(quote.spreadBps) / 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {quote.fee > BigInt(0) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-mono text-foreground">
                        {parseFloat(formatUnits(quote.fee, 6)).toFixed(2)} mAED
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Execute Button */}
              <Button
                onClick={handleTrade}
                disabled={
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  quote.isLoading ||
                  isTrading ||
                  !!quote.error
                }
                className={cn(
                  'w-full h-14 text-base font-semibold rounded-xl transition-all cursor-pointer',
                  mode === 'buy'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                )}
                size="lg"
              >
                {isTrading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    {mode === 'buy' ? 'Buy' : 'Sell'}{' '}
                    {selectedAsset?.tokenSymbol}
                    {outputFormatted && (
                      <span className="opacity-70">
                        {mode === 'buy'
                          ? `— receive ${outputFormatted}`
                          : `— receive ${outputFormatted} mAED`}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MintMaedDialog
        open={mintDialogOpen}
        onOpenChange={setMintDialogOpen}
      />
    </div>
  );
}
