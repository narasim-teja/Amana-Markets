'use client';

/**
 * Price Feeds Page
 * Monitor price feeds and health across 100+ assets
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import type { LivePriceData } from '@/types/api';
import { enrichAssetWithMetadata, type ApiAsset } from '@/lib/assets';
import { formatRelativeTime, isPriceStale } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OracleSource {
  name: string;
  price: string;
  timestamp: number;
  isStale: boolean;
}

interface AssetOracleData {
  assetId: string;
  name: string;
  symbol: string;
  color: string;
  category: string;
  sources: OracleSource[];
  primarySource: string;
  medianPrice: number;
  allHealthy: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'commodity', label: 'Commodities' },
  { value: 'stock', label: 'Stocks' },
  { value: 'etf', label: 'ETFs' },
  { value: 'fx', label: 'FX' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'Pyth', label: 'Pyth' },
  { value: 'DIA', label: 'DIA' },
  { value: 'RedStone', label: 'RedStone' },
  { value: 'Yahoo', label: 'Yahoo' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'stale', label: 'Stale' },
  { value: 'nodata', label: 'No Data' },
];

const CATEGORY_COLORS: Record<string, string> = {
  commodity: 'border-amber-500/30 text-amber-400',
  stock: 'border-blue-500/30 text-blue-400',
  etf: 'border-purple-500/30 text-purple-400',
  fx: 'border-emerald-500/30 text-emerald-400',
};

const SOURCE_COLORS: Record<string, string> = {
  Pyth: 'border-violet-500/30 text-violet-400',
  DIA: 'border-cyan-500/30 text-cyan-400',
  RedStone: 'border-red-500/30 text-red-400',
  Yahoo: 'border-yellow-500/30 text-yellow-400',
};

export default function OracleStatusPage() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch prices via REST (polls every 60s)
  const { data: pricesResponse } = useQuery({
    queryKey: ['prices', 'live'],
    queryFn: () => apiClient.getLivePrices(),
    refetchInterval: 60_000,
  });

  const pricesData: LivePriceData[] = useMemo(() => pricesResponse?.prices || [], [pricesResponse]);

  // Process oracle data for each asset
  const oracleData: AssetOracleData[] = useMemo(() => {
    if (!assetsData) return [];

    return assetsData.map((asset) => {
      const priceData = pricesData.find((p: LivePriceData) => p.assetId === asset.assetId);

      if (!priceData || !priceData.sources) {
        return {
          assetId: asset.assetId,
          name: asset.name,
          symbol: asset.symbol,
          color: asset.color,
          category: priceData?.category || 'commodity',
          sources: [],
          primarySource: '—',
          medianPrice: 0,
          allHealthy: false,
        };
      }

      const sources: OracleSource[] = [];

      if (priceData.sources.pyth) {
        sources.push({
          name: 'Pyth',
          price: priceData.sources.pyth.price,
          timestamp: priceData.sources.pyth.timestamp,
          isStale: priceData.sources.pyth.status === 'stale' || isPriceStale(priceData.sources.pyth.timestamp),
        });
      }
      if (priceData.sources.dia) {
        sources.push({
          name: 'DIA',
          price: priceData.sources.dia.price,
          timestamp: priceData.sources.dia.timestamp,
          isStale: priceData.sources.dia.status === 'stale' || isPriceStale(priceData.sources.dia.timestamp),
        });
      }
      if (priceData.sources.redstone) {
        sources.push({
          name: 'RedStone',
          price: priceData.sources.redstone.price,
          timestamp: priceData.sources.redstone.timestamp,
          isStale: priceData.sources.redstone.status === 'stale' || isPriceStale(priceData.sources.redstone.timestamp),
        });
      }
      if (priceData.sources.yahoo) {
        sources.push({
          name: 'Yahoo',
          price: priceData.sources.yahoo.price,
          timestamp: priceData.sources.yahoo.timestamp,
          isStale: priceData.sources.yahoo.status === 'stale' || isPriceStale(priceData.sources.yahoo.timestamp),
        });
      }

      // Calculate median price
      const prices = sources
        .filter((s) => !s.isStale)
        .map((s) => parseFloat(s.price))
        .sort((a, b) => a - b);
      const medianPrice =
        prices.length > 0
          ? prices.length % 2 === 0
            ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
            : prices[Math.floor(prices.length / 2)]
          : 0;

      const allHealthy = sources.length > 0 && sources.every((s) => !s.isStale);
      const primarySource = sources.length > 0 ? sources[0].name : '—';

      return {
        assetId: asset.assetId,
        name: asset.name,
        symbol: asset.symbol,
        color: asset.color,
        category: priceData.category || 'commodity',
        sources,
        primarySource,
        medianPrice,
        allHealthy,
      };
    });
  }, [assetsData, pricesData]);

  // Apply filters
  const filteredData = useMemo(() => {
    return oracleData.filter((oracle) => {
      if (categoryFilter !== 'all' && oracle.category !== categoryFilter) return false;
      if (sourceFilter !== 'all' && !oracle.sources.some((s) => s.name === sourceFilter)) return false;
      if (statusFilter === 'healthy' && !oracle.allHealthy) return false;
      if (statusFilter === 'stale' && oracle.allHealthy) return false;
      if (statusFilter === 'nodata' && oracle.sources.length > 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!oracle.name.toLowerCase().includes(q) && !oracle.symbol.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [oracleData, categoryFilter, sourceFilter, statusFilter, searchQuery]);

  // Stats
  const healthyAssets = oracleData.filter((d) => d.allHealthy).length;
  const totalAssets = oracleData.length;
  const healthPercent = totalAssets > 0 ? (healthyAssets / totalAssets) * 100 : 0;
  const filteredHealthy = filteredData.filter((d) => d.allHealthy).length;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    oracleData.forEach((o) => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    return counts;
  }, [oracleData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Price Feeds</h2>
        <p className="text-muted-foreground">
          Price feed monitoring across {totalAssets} assets
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Healthy
            </CardTitle>
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-gold">
              {healthyAssets}<span className="text-sm text-muted-foreground font-normal">/{totalAssets}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Health Score
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-gold" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-mono font-bold',
              healthPercent >= 90 ? 'text-emerald-400' :
              healthPercent >= 50 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {healthPercent.toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sources Active
            </CardTitle>
            <Zap className="h-3.5 w-3.5 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-gold">4</div>
            <p className="text-xs text-muted-foreground mt-0.5">Pyth, DIA, RedStone, Yahoo</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Categories
            </CardTitle>
            <Filter className="h-3.5 w-3.5 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <Badge key={cat} variant="outline" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[cat])}>
                  {cat === 'fx' ? 'FX' : cat.charAt(0).toUpperCase() + cat.slice(1)} {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="premium-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-dark-800/50 border-dark-600"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40 bg-dark-800/50 border-dark-600">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-37.5 bg-dark-800/50 border-dark-600">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-37.5 bg-dark-800/50 border-dark-600">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter summary */}
          {(categoryFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700">
              <span className="text-xs text-muted-foreground">
                Showing {filteredData.length} of {totalAssets} assets
                ({filteredHealthy} healthy)
              </span>
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setSourceFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-gold hover:text-gold/80 ml-auto"
              >
                Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oracle Table */}
      <Card className="premium-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-dark-700 hover:bg-transparent">
                <TableHead className="w-55">Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price (USD)</TableHead>
                <TableHead className="text-right">Last Update</TableHead>
                <TableHead className="text-right">Deviation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No assets match your filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((oracle) => (
                  <OracleAssetRow key={oracle.assetId} oracle={oracle} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="premium-card">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span>Live — updated within 2 hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-400" />
              <span>Stale — no update for &gt;2 hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span>High deviation — &gt;2% from median</span>
            </div>
            <span className="ml-auto">Relayer cycle: 60 min | Staleness threshold: 2 hours</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OracleAssetRow({ oracle }: { oracle: AssetOracleData }) {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleSources = oracle.sources.length > 1;

  // Primary source = first non-stale source, or first source
  const primarySource = oracle.sources.find((s) => !s.isStale) || oracle.sources[0];
  const primaryPrice = primarySource ? parseFloat(primarySource.price) : 0;

  // Deviation of primary from median
  const deviation =
    oracle.medianPrice > 0 && primarySource
      ? ((primaryPrice - oracle.medianPrice) / oracle.medianPrice) * 100
      : 0;
  const isDeviationHigh = Math.abs(deviation) > 2;

  return (
    <>
      <TableRow
        className={cn(
          'border-dark-700 cursor-pointer transition-colors',
          hasMultipleSources && 'hover:bg-dark-800/50',
          expanded && 'bg-dark-800/30'
        )}
        onClick={() => hasMultipleSources && setExpanded(!expanded)}
      >
        {/* Asset */}
        <TableCell>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${oracle.color}20` }}
            >
              <Activity className="h-4 w-4" style={{ color: oracle.color }} />
            </div>
            <div>
              <p className="font-semibold text-sm">{oracle.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{oracle.symbol}</p>
            </div>
            {hasMultipleSources && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {expanded ? '▾' : '▸'} {oracle.sources.length}
              </span>
            )}
          </div>
        </TableCell>

        {/* Category */}
        <TableCell>
          <Badge variant="outline" className={cn('text-[10px] px-1.5', CATEGORY_COLORS[oracle.category])}>
            {oracle.category === 'fx' ? 'FX' : oracle.category.charAt(0).toUpperCase() + oracle.category.slice(1)}
          </Badge>
        </TableCell>

        {/* Source badges */}
        <TableCell>
          <div className="flex gap-1">
            {oracle.sources.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              oracle.sources.map((s) => (
                <Badge
                  key={s.name}
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', SOURCE_COLORS[s.name])}
                >
                  {s.name}
                </Badge>
              ))
            )}
          </div>
        </TableCell>

        {/* Status */}
        <TableCell>
          {oracle.sources.length === 0 ? (
            <Badge variant="outline" className="gap-1 text-muted-foreground border-dark-600 text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              No Data
            </Badge>
          ) : oracle.allHealthy ? (
            <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400 text-[10px]">
              <CheckCircle className="h-2.5 w-2.5" />
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-red-500/30 text-red-400 text-[10px]">
              <XCircle className="h-2.5 w-2.5" />
              Stale
            </Badge>
          )}
        </TableCell>

        {/* Price */}
        <TableCell className="text-right font-mono text-sm">
          {oracle.medianPrice > 0
            ? `$${oracle.medianPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
        </TableCell>

        {/* Last Update */}
        <TableCell className="text-right text-xs text-muted-foreground">
          {primarySource ? formatRelativeTime(primarySource.timestamp) : '—'}
        </TableCell>

        {/* Deviation */}
        <TableCell className="text-right">
          {oracle.sources.length > 1 ? (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                isDeviationHigh ? 'text-yellow-400 border-yellow-500/30' : 'text-muted-foreground border-dark-600'
              )}
            >
              {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded source details */}
      {expanded && oracle.sources.map((source) => {
        const price = parseFloat(source.price);
        const srcDeviation =
          oracle.medianPrice > 0
            ? ((price - oracle.medianPrice) / oracle.medianPrice) * 100
            : 0;
        const isSrcDeviationHigh = Math.abs(srcDeviation) > 2;

        return (
          <TableRow key={source.name} className="border-dark-700/50 bg-dark-800/20">
            <TableCell className="pl-14">
              <span className="text-xs text-muted-foreground">{'\u2514'} </span>
              <span className="text-xs font-medium">{source.name}</span>
            </TableCell>
            <TableCell />
            <TableCell>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', SOURCE_COLORS[source.name])}>
                {source.name}
              </Badge>
            </TableCell>
            <TableCell>
              {source.isStale ? (
                <Badge variant="outline" className="gap-1 border-red-500/30 text-red-400 text-[10px]">
                  <XCircle className="h-2.5 w-2.5" />
                  Stale
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400 text-[10px]">
                  <CheckCircle className="h-2.5 w-2.5" />
                  Live
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">
              {formatRelativeTime(source.timestamp)}
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  isSrcDeviationHigh ? 'text-yellow-400 border-yellow-500/30' : 'text-muted-foreground border-dark-600'
                )}
              >
                {srcDeviation > 0 ? '+' : ''}{srcDeviation.toFixed(2)}%
              </Badge>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
