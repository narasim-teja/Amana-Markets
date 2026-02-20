'use client';

/**
 * Trading View Page
 * Main trading interface for buying/selling commodity tokens
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { enrichAssetWithMetadata, type AssetMetadata } from '@/lib/assets';
import { useLivePrice } from '@/hooks/api/use-prices';
import { useQuote } from '@/hooks/api/use-quote';
import { usePosition } from '@/hooks/api/use-position';
import { useUserStatus } from '@/hooks/blockchain/use-user-status';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { CONTRACTS } from '@/lib/contracts';
import { formatAED, formatCommodityPrice, formatRelativeTime, isPriceStale } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Radio,
  Wallet,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits, parseUnits } from 'viem';

type TradeMode = 'buy' | 'sell';

export default function TradePage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');

  // Fetch assets
  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: any) => enrichAssetWithMetadata(asset));
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
  const { price: livePrice, isConnected: wsConnected } = useLivePrice(selectedAssetId);

  // Get quote
  const quote = useQuote(selectedAssetId, mode === 'buy', amount);

  // Get user position
  const { data: position } = usePosition(selectedAssetId, selectedAsset?.tokenAddress || null);

  // Check user status
  const { data: userStatus } = useUserStatus();

  // Contract write hook
  const { execute: executeTrade, isLoading: isTrading } = useContractWrite();
  const { execute: executeApprove, isLoading: isApproving } = useContractWrite();

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-display text-gold mb-4">Connect Wallet to Trade</h2>
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
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-warning" />
              <CardTitle className="text-xl">KYC Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userStatus?.isBlacklisted ? (
              <p className="text-muted-foreground">
                Your address has been blacklisted and cannot trade on this platform.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Your address must be whitelisted to trade commodities. Please contact our
                  compliance team to complete KYC verification.
                </p>
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-sm font-mono text-gold break-all">{wallet?.address}</p>
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

    if (!quote.totalCost || quote.totalCost === 0n) {
      toast.error('Failed to get quote');
      return;
    }

    try {
      const amountWei = parseUnits(amount, 8);

      if (mode === 'buy') {
        // Check mAED allowance first
        // For now, we'll execute the buy directly
        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'buy',
          args: [selectedAssetId, amountWei],
          successMessage: `Bought ${amount} ${selectedAsset?.symbol}`,
        });
      } else {
        // Sell - check commodity token allowance first
        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'sell',
          args: [selectedAssetId, amountWei],
          successMessage: `Sold ${amount} ${selectedAsset?.symbol}`,
        });
      }

      setAmount('');
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  const medianPrice = livePrice?.medianPrice ? parseFloat(livePrice.medianPrice) : 0;
  const isStale = livePrice?.timestamp ? isPriceStale(livePrice.timestamp) : true;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Trade Commodities</h2>
        <p className="text-muted-foreground">
          Buy and sell tokenized gold, silver, and oil with real-time pricing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trading Card */}
        <Card className="premium-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-display">Execute Trade</CardTitle>
              <Badge variant={wsConnected ? 'default' : 'outline'} className="gap-1">
                <Radio className={`h-3 w-3 ${wsConnected ? 'text-success' : ''}`} />
                {wsConnected ? 'Live' : 'Disconnected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset Selector */}
            <div>
              <Label>Select Asset</Label>
              <Select
                value={selectedAssetId || ''}
                onValueChange={(value) => {
                  setSelectedAssetId(value);
                  setAmount('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose commodity..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" style={{ color: asset.color }} />
                        <span>{asset.name}</span>
                        <span className="text-muted-foreground font-mono text-sm">
                          {asset.symbol}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buy/Sell Tabs */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as TradeMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-success/20">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-destructive/20">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value={mode} className="space-y-4 mt-6">
                {/* Amount Input */}
                <div>
                  <Label htmlFor="amount">
                    Amount ({selectedAsset?.symbol || 'Units'})
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="text-xl font-mono"
                  />
                </div>

                {/* Quote Display */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="p-4 bg-dark-800/50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">You {mode === 'buy' ? 'pay' : 'receive'}:</span>
                      <span className="font-mono text-lg font-semibold text-gold">
                        {quote.isLoading
                          ? 'Loading...'
                          : quote.error
                          ? 'Error'
                          : `${formatAED(formatUnits(quote.totalCost, 6))} mAED`}
                      </span>
                    </div>
                    {medianPrice > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Reference Price:</span>
                        <span className="font-mono">${medianPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Trade Button */}
                <Button
                  onClick={handleTrade}
                  disabled={
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    quote.isLoading ||
                    isTrading ||
                    !!quote.error
                  }
                  className={`w-full ${
                    mode === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
                  }`}
                  size="lg"
                >
                  {isTrading ? (
                    'Processing...'
                  ) : mode === 'buy' ? (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy {selectedAsset?.symbol}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell {selectedAsset?.symbol}
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Price Card */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Live Price</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAsset && (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${selectedAsset.color}20` }}
                    >
                      <Activity className="h-6 w-6" style={{ color: selectedAsset.color }} />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold">{selectedAsset.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedAsset.symbol}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Median Price</p>
                    <p className="font-mono text-3xl font-semibold text-gold">
                      ${medianPrice.toFixed(2)}
                    </p>
                    {livePrice && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(livePrice.timestamp)}
                      </p>
                    )}
                  </div>

                  <Badge variant={isStale ? 'destructive' : 'default'} className="w-full justify-center gap-1">
                    {isStale ? (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Price Stale
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Price Fresh
                      </>
                    )}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          {/* Position Card */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Your Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {position && parseFloat(position.commodityBalance) > 0 ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Holdings</p>
                    <p className="font-mono text-2xl font-semibold">
                      {formatCommodityPrice(position.commodityBalance)}{' '}
                      <span className="text-lg text-muted-foreground">{selectedAsset?.symbol}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cost Basis</p>
                    <p className="font-mono text-lg">
                      {formatAED(position.costBasis)} mAED
                    </p>
                  </div>
                  {/* TODO: Add PnL when current value is calculated */}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No position yet</p>
                  <p className="text-xs mt-1">Buy to start building a position</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
