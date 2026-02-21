'use client';

/**
 * Trading View Page
 * Professional trading interface for buying/selling commodity tokens
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSmartAccount } from '@/hooks/blockchain/use-smart-account';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  enrichAssetWithMetadata,
  type AssetMetadata,
  type ApiAsset,
  type AssetCategory,
} from '@/lib/assets';
import { useQuote } from '@/hooks/api/use-quote';
import { usePosition } from '@/hooks/api/use-position';
import { useUserStatus } from '@/hooks/blockchain/use-user-status';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { useMaedBalance } from '@/hooks/blockchain/use-maed-balance';
import { CONTRACTS } from '@/lib/contracts';
import {
  formatAED,
  formatCommodityPrice,
} from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  ArrowDown,
  Coins,
  BarChart3,
  Zap,
  ChevronDown,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPublicClient, http, formatUnits, parseUnits, maxUint256 } from 'viem';
import { adiTestnet } from '@/lib/chain';
import { cn } from '@/lib/utils';
import { BuyDDSCDialog } from '@/components/buy-ddsc-dialog';
import { PriceChart } from '@/components/charts/price-chart';
import { TimeframeSelector } from '@/components/charts/timeframe-selector';
import { usePriceChart } from '@/hooks/api/use-price-chart';
import { useLivePrice } from '@/hooks/api/use-prices';
import { useFxRate } from '@/hooks/blockchain/use-fx-rate';
import { useSponsorshipStatus } from '@/hooks/blockchain/use-sponsorship-status';
import { useSponsoredWrite } from '@/hooks/blockchain/use-sponsored-write';
import { Fuel } from 'lucide-react';

type TradeMode = 'buy' | 'sell';
type GasMode = 'standard' | 'sponsored' | 'erc20';

const ERC20_PAYMASTER: `0x${string}` = '0x21A223F0efD59757750c229B77C551D3fC7b04C0';

// Featured assets appear first: Gold, Silver, Crude Oil (WTI)
const FEATURED_SYMBOLS = ['XAU', 'XAG', 'WTI'];

const CATEGORY_TABS: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'commodity', label: 'Commodities' },
  { value: 'adx_stock', label: 'AD Equities' },
  { value: 'stock', label: 'US Equities' },
  { value: 'etf', label: 'ETFs' },
  { value: 'fx', label: 'FX' },
];

export default function TradePage() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const { displayAddress: smartAccountAddress } = useSmartAccount();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [gasMode, setGasMode] = useState<GasMode>('sponsored');

  // Market selector dropdown
  const [marketOpen, setMarketOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMarketOpen(false);
      }
    }
    if (marketOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [marketOpen]);

  // Live price from middleware API (USD, 8 decimals) — passed to contract for trades
  const { price: livePrice } = useLivePrice(selectedAssetId);
  const usdPriceRaw = livePrice?.displayPriceRaw
    ? BigInt(livePrice.displayPriceRaw)
    : null;

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

  // Category filter for asset selector
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let filtered = categoryFilter === 'all'
      ? assets
      : assets.filter((a) => a.category === categoryFilter);

    if (q) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q) ||
          a.tokenSymbol.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      const aIdx = FEATURED_SYMBOLS.indexOf(a.symbol);
      const bIdx = FEATURED_SYMBOLS.indexOf(b.symbol);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
  }, [assets, categoryFilter, searchQuery]);

  // Set default asset if none selected
  if (assets.length > 0 && !selectedAssetId) {
    setSelectedAssetId(assets[0].assetId);
  }

  // Get quote (passes live USD price to contract for trusted price mode)
  const quote = useQuote(selectedAssetId, mode === 'buy', amount, usdPriceRaw);

  // Get user position
  const { data: position } = usePosition(
    selectedAssetId,
    selectedAsset?.tokenAddress || null
  );

  // Check user status
  const { data: userStatus, isLoading: statusLoading } = useUserStatus();

  // Contract write hook (standard EOA)
  const { writeContract: executeTradeStandard, isLoading: isTradingStandard } =
    useContractWrite();

  // Sponsored write hooks
  const { writeContract: executeSponsoredNative, isLoading: isSponsoredNativeLoading } =
    useSponsoredWrite('native');
  const { writeContract: executeSponsoredErc20, isLoading: isSponsoredErc20Loading } =
    useSponsoredWrite('erc20');

  // Sponsorship status
  const { isEnabled: sponsorshipEnabled, isEligible: sponsorshipEligible, remaining: sponsoredRemaining } =
    useSponsorshipStatus();

  // Pick the right executor based on gas mode
  const executeTrade = gasMode === 'sponsored'
    ? executeSponsoredNative
    : gasMode === 'erc20'
      ? executeSponsoredErc20
      : executeTradeStandard;
  const isTrading = isTradingStandard || isSponsoredNativeLoading || isSponsoredErc20Loading;

  // DDSC balance
  const { balance: maedBalance, isLoading: maedLoading } = useMaedBalance();

  // Chart data
  const {
    data: chartData,
    latestPoint,
    isLoading: chartLoading,
    range,
    setRange,
  } = usePriceChart(selectedAssetId, selectedAsset?.category === 'adx_stock' ? '1y' : '24h');
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);

  // On-chain FX rate (USD → AED)
  const { rate: fxRate } = useFxRate();

  if (!ready || (authenticated && statusLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-display text-gold mb-4">
            Connect Account to Trade
          </h2>
          <p className="text-muted-foreground mb-8">
            Access premium commodity trading on the ADI blockchain
          </p>
          <Button onClick={login} size="lg" className="btn-gold">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Account
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
                    {smartAccountAddress ?? wallet?.address}
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

    if (!usdPriceRaw || usdPriceRaw === BigInt(0)) {
      toast.error('Price not available yet. Please wait.');
      return;
    }

    try {
      if (mode === 'buy') {
        // Buy: amount is DDSC (6 decimals)
        const amountWei = parseUnits(amount, 6);

        // Check DDSC allowance — must match execution context
        const allowanceAddress = gasMode === 'standard'
          ? wallet.address as `0x${string}`
          : smartAccountAddress as `0x${string}`;

        if (!allowanceAddress) {
          toast.error('Smart account loading, please wait.');
          return;
        }

        const publicClient = createPublicClient({
          chain: adiTestnet,
          transport: http(),
        });

        // ERC20 gas mode: smart account must approve the ERC20 paymaster to
        // spend DDSC for gas fees. This one-time approval uses native
        // sponsorship (can't pay DDSC gas before paymaster is approved).
        if (gasMode === 'erc20') {
          const pmAllowance = (await publicClient.readContract({
            address: CONTRACTS.MockDirham.address,
            abi: CONTRACTS.MockDirham.abi,
            functionName: 'allowance',
            args: [allowanceAddress, ERC20_PAYMASTER],
          })) as bigint;

          if (pmAllowance < maxUint256 / BigInt(2)) {
            toast.info('One-time: approving DDSC for gas payments...');
            await executeSponsoredNative({
              address: CONTRACTS.MockDirham.address,
              abi: CONTRACTS.MockDirham.abi,
              functionName: 'approve',
              args: [ERC20_PAYMASTER, maxUint256],
            });
          }
        }

        const allowance = (await publicClient.readContract({
          address: CONTRACTS.MockDirham.address,
          abi: CONTRACTS.MockDirham.abi,
          functionName: 'allowance',
          args: [allowanceAddress, CONTRACTS.TradingEngine.address],
        })) as bigint;

        if (allowance < amountWei) {
          toast.info('Approving DDSC spend...');
          await executeTrade({
            address: CONTRACTS.MockDirham.address,
            abi: CONTRACTS.MockDirham.abi,
            functionName: 'approve',
            args: [CONTRACTS.TradingEngine.address, maxUint256],
          });
        }

        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'buy',
          args: [selectedAssetId, amountWei, usdPriceRaw],
        });
      } else {
        // Sell: amount is commodity tokens (18 decimals)
        // No approval needed — TradingEngine has minter privilege to burn
        const amountWei = parseUnits(amount, 18);
        await executeTrade({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'sell',
          args: [selectedAssetId, amountWei, usdPriceRaw],
        });
      }

      setAmount('');
    } catch (error) {
      console.error('Trade failed:', error);
    }
  };

  const chartPrice = (latestPoint?.price ?? 0) * fxRate;
  const hasPosition = position && parseFloat(position.commodityBalance) > 0;

  // Convert chart data from USD to DDSC
  const chartDataAed = chartData.map((d) => ({ ...d, price: d.price * fxRate }));
  const latestPointAed = latestPoint
    ? { ...latestPoint, price: latestPoint.price * fxRate }
    : null;

  // Chart color - override near-black Oil color for visibility on dark bg
  const chartColor =
    selectedAsset?.color === '#1A1A1A'
      ? '#4A9EFF'
      : selectedAsset?.color ?? '#C9A96E';
  const displayPrice = hoveredPrice ?? chartPrice;

  // Buy: outputAmount is tokensOut (18 dec). Sell: outputAmount is stablecoinOut (6 dec).
  const outputFormatted =
    quote.outputAmount > BigInt(0)
      ? mode === 'buy'
        ? parseFloat(formatUnits(quote.outputAmount, 18)).toFixed(4)
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
      </div>

      {/* Main Grid - Chart Left, Trading Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Chart Panel */}
        <div className="lg:col-span-8 space-y-4 order-2 lg:order-1">
          {/* Chart Card */}
          <div className="premium-card">
            {/* Chart Header — Market Selector + Price */}
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex items-center gap-4">
                {/* Market Selector Trigger */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => { setMarketOpen(!marketOpen); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border border-dark-700 bg-dark-900/50 hover:border-dark-600 transition-all"
                  >
                    {selectedAsset && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${selectedAsset.color}20` }}
                      >
                        <Activity className="h-4 w-4" style={{ color: selectedAsset.color }} />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-semibold text-foreground">
                        {selectedAsset?.symbol ?? 'Select'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedAsset?.name ?? 'Market'}
                      </div>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', marketOpen && 'rotate-180')} />
                  </button>

                  {/* Dropdown Panel */}
                  {marketOpen && (
                    <div className="absolute top-full left-0 mt-2 w-[380px] bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                      {/* Search */}
                      <div className="p-3 border-b border-dark-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search markets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 text-sm bg-dark-800 border border-dark-600 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                          />
                        </div>
                      </div>

                      {/* Category Tabs */}
                      <div className="flex gap-1 p-2 border-b border-dark-700 overflow-x-auto">
                        {CATEGORY_TABS.map((tab) => (
                          <button
                            key={tab.value}
                            onClick={() => setCategoryFilter(tab.value)}
                            className={cn(
                              'px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                              categoryFilter === tab.value
                                ? 'bg-gold/15 text-gold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-dark-800'
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Asset List */}
                      <div className="max-h-[320px] overflow-y-auto">
                        {filteredAssets.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            No markets found
                          </div>
                        ) : (
                          filteredAssets.map((asset) => {
                            const isSelected = asset.assetId === selectedAssetId;
                            return (
                              <button
                                key={asset.assetId}
                                onClick={() => {
                                  setSelectedAssetId(asset.assetId);
                                  setAmount('');
                                  setMarketOpen(false);
                                  setSearchQuery('');
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-dark-800/70',
                                  isSelected && 'bg-gold/5'
                                )}
                              >
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${asset.color}20` }}
                                >
                                  <Activity className="h-3.5 w-3.5" style={{ color: asset.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn('text-sm font-medium truncate', isSelected ? 'text-gold' : 'text-foreground')}>
                                    {asset.symbol}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {asset.name}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono flex-shrink-0">
                                  {asset.tokenSymbol}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Display */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      {displayPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      <span className="text-sm text-muted-foreground ml-1">DDSC</span>
                    </span>
                    {chartPrice > 0 && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Activity className="h-3 w-3" /> Live
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <TimeframeSelector selected={range} onChange={setRange} />
            </div>

            {/* Price Chart */}
            <div className="h-[400px]">
              {chartLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground text-sm">Loading chart...</div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No price data available yet</p>
                  </div>
                </div>
              ) : (
                <PriceChart
                  data={chartDataAed}
                  latestPoint={latestPointAed}
                  color={chartColor}
                  height={400}
                  range={range}
                  onCrosshairMove={(price) => setHoveredPrice(price)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Trading Form + Balance + Position */}
        <div className="lg:col-span-4 space-y-4 order-1 lg:order-2">
          {/* Trading Form */}
          <div className="premium-card">
            {/* Buy / Sell Toggle */}
            <div className="flex rounded-xl bg-dark-900 p-1 mb-5">
              <button
                onClick={() => setMode('buy')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
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
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
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
            <div className="space-y-3">
              {/* TOP INPUT — what the user types */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">
                    {mode === 'buy' ? 'You pay' : 'You sell'}
                  </span>
                  {mode === 'buy' && (
                    <span className="text-xs text-muted-foreground">
                      Bal: {maedLoading ? '...' : maedBalance}
                    </span>
                  )}
                  {mode === 'sell' && hasPosition && selectedAsset && (
                    <button
                      onClick={() =>
                        setAmount(
                          formatUnits(BigInt(position.commodityBalance), 18)
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
                    className="text-xl font-mono h-14 pr-28 bg-dark-900 border-dark-700 focus:border-gold/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {mode === 'buy' ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                          <Coins className="h-3 w-3 text-gold" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          DDSC
                        </span>
                      </>
                    ) : (
                      selectedAsset && (
                        <>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${selectedAsset.color}20`,
                            }}
                          >
                            <Activity
                              className="h-3 w-3"
                              style={{ color: selectedAsset.color }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
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
                <div className="w-8 h-8 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center">
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* BOTTOM — computed output (read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">
                    You receive
                  </span>
                </div>
                <div className="relative">
                  <div className="h-14 flex items-center px-4 bg-dark-900 border border-dark-700 rounded-md">
                    <span
                      className={cn(
                        'text-xl font-mono',
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
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: `${selectedAsset.color}20`,
                            }}
                          >
                            <Activity
                              className="h-3 w-3"
                              style={{ color: selectedAsset.color }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {selectedAsset.tokenSymbol}
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                          <Coins className="h-3 w-3 text-gold" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          DDSC
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              {amount && parseFloat(amount) > 0 && outputFormatted && (
                <div className="bg-dark-900/60 rounded-xl p-3 space-y-2 text-sm">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Order Summary
                  </span>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {mode === 'buy' ? 'Est. Quantity' : 'Sell Quantity'}
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {mode === 'buy' ? outputFormatted : parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}{' '}
                      {selectedAsset?.tokenSymbol}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Price</span>
                    <span className="font-mono text-xs text-foreground">
                      {chartPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      DDSC / {selectedAsset?.tokenSymbol}
                    </span>
                  </div>

                  {quote.fee > BigInt(0) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trading Fee ({(Number(quote.spreadBps) / 100).toFixed(2)}%)</span>
                      <span className="font-mono text-xs text-foreground">
                        {parseFloat(formatUnits(quote.fee, 6)).toFixed(2)} DDSC
                      </span>
                    </div>
                  )}

                  <div className="h-px bg-dark-700" />

                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {mode === 'buy' ? 'Total Cost' : 'Net Proceeds'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {mode === 'buy'
                        ? parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : outputFormatted}{' '}
                      DDSC
                    </span>
                  </div>
                </div>
              )}

              {/* Gas Mode Selector */}
              {sponsorshipEnabled && (
                <div className="bg-dark-900/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Gas Payment</span>
                    </div>
                    {gasMode !== 'standard' && sponsorshipEligible && (
                      <span className="text-[10px] text-gold">
                        {sponsoredRemaining} left this hour
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 rounded-lg bg-dark-950 p-0.5">
                    <button
                      onClick={() => setGasMode('standard')}
                      className={cn(
                        'flex-1 text-xs py-1.5 rounded-md font-medium transition-all',
                        gasMode === 'standard'
                          ? 'bg-dark-700 text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setGasMode('sponsored')}
                      disabled={!sponsorshipEligible}
                      className={cn(
                        'flex-1 text-xs py-1.5 rounded-md font-medium transition-all',
                        gasMode === 'sponsored'
                          ? 'bg-gold/15 text-gold'
                          : 'text-muted-foreground hover:text-foreground',
                        !sponsorshipEligible && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      Sponsored
                    </button>
                    <button
                      onClick={() => setGasMode('erc20')}
                      disabled={!sponsorshipEligible}
                      className={cn(
                        'flex-1 text-xs py-1.5 rounded-md font-medium transition-all',
                        gasMode === 'erc20'
                          ? 'bg-gold/15 text-gold'
                          : 'text-muted-foreground hover:text-foreground',
                        !sponsorshipEligible && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      Pay DDSC
                    </button>
                  </div>
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
                  'w-full h-12 text-sm font-semibold rounded-xl transition-all cursor-pointer',
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
                    {gasMode !== 'standard' ? (
                      <Fuel className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {mode === 'buy' ? 'Buy' : 'Sell'}{' '}
                    {selectedAsset?.tokenSymbol}
                    {gasMode === 'sponsored' && (
                      <Badge variant="default" className="text-[10px] ml-1 py-0 px-1.5">
                        Gas Free
                      </Badge>
                    )}
                    {gasMode === 'erc20' && (
                      <Badge variant="default" className="text-[10px] ml-1 py-0 px-1.5">
                        DDSC Gas
                      </Badge>
                    )}
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="premium-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Balance
                </span>
              </div>
              <button
                onClick={() => setMintDialogOpen(true)}
                className="text-xs font-medium text-gold hover:text-gold-light transition-colors flex items-center gap-1 cursor-pointer"
              >
                + Buy DDSC
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DDSC</span>
                <span className="font-mono text-base font-semibold text-foreground">
                  {maedLoading ? '...' : maedBalance}
                </span>
              </div>
              {hasPosition && selectedAsset && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedAsset.tokenSymbol}
                  </span>
                  <span className="font-mono text-base font-semibold text-foreground">
                    {formatCommodityPrice(position.commodityBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Position */}
          <div className="premium-card">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Position
              </span>
            </div>
            {hasPosition && selectedAsset ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Holdings
                  </div>
                  <div className="font-mono text-xl font-bold">
                    {formatCommodityPrice(position.commodityBalance)}
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      {selectedAsset.tokenSymbol}
                    </span>
                  </div>
                </div>
                <div className="h-px bg-dark-700" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Cost Basis
                    </div>
                    <div className="font-mono text-sm font-semibold">
                      {formatAED(position.costBasis)} DDSC
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Mkt Value
                    </div>
                    <div className="font-mono text-sm font-semibold">
                      {chartPrice > 0
                        ? `${(
                            parseFloat(
                              formatUnits(BigInt(position.commodityBalance), 18)
                            ) * chartPrice
                          ).toFixed(2)} DDSC`
                        : '--'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Wallet className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                <p className="text-sm">No position yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BuyDDSCDialog
        open={mintDialogOpen}
        onOpenChange={setMintDialogOpen}
      />
    </div>
  );
}
