'use client';

/**
 * Asset Management Page
 * Admin can pause/unpause assets, adjust spreads, update limits
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { CONTRACTS } from '@/lib/contracts';
import { enrichAssetWithMetadata, type AssetMetadata, type ApiAsset } from '@/lib/assets';
import { formatCompactNumber } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  Pause,
  Play,
  Settings,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssetsManagementPage() {
  // Fetch assets
  const { data: assetsData, refetch: refetchAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: ApiAsset) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch per-asset exposure directly from contract
  const { data: exposureData } = useQuery({
    queryKey: ['treasuryExposure'],
    queryFn: () => apiClient.getTreasuryExposure(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  const assets: AssetMetadata[] = assetsData || [];

  // Build a lookup map for exposure by asset_id
  const exposureMap = new Map<string, string>();
  exposureData?.assetExposures?.forEach((e: { asset_id: string; asset_exposure: string }) => {
    exposureMap.set(e.asset_id, e.asset_exposure);
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Asset Management</h2>
        <p className="text-muted-foreground">
          Control trading parameters and fees
        </p>
      </div>

      {/* Global Controls */}
      <GlobalControlsCard />

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <AssetCard
            key={asset.assetId}
            asset={asset}
            openInterest={exposureMap.get(asset.assetId) || '0'}
            onUpdate={refetchAssets}
          />
        ))}
      </div>
    </div>
  );
}

interface AssetCardProps {
  asset: AssetMetadata;
  onUpdate: () => void;
}

function AssetCard({ asset, openInterest, onUpdate }: AssetCardProps & { openInterest: string }) {
  const { writeContract: executePause, isLoading: isPausing } = useContractWrite();

  const isPaused = asset.status === 'paused';
  const oiValue = parseFloat(openInterest) / 1e6;

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await executePause({
          address: CONTRACTS.AssetRegistry.address,
          abi: CONTRACTS.AssetRegistry.abi,
          functionName: 'unpauseAsset',
          args: [asset.assetId],
        });
      } else {
        await executePause({
          address: CONTRACTS.AssetRegistry.address,
          abi: CONTRACTS.AssetRegistry.abi,
          functionName: 'pauseAsset',
          args: [asset.assetId],
        });
      }
      onUpdate();
    } catch (error) {
      console.error('Toggle pause failed:', error);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${asset.color}20` }}
            >
              <Activity className="h-5 w-5" style={{ color: asset.color }} />
            </div>
            <div>
              <CardTitle className="text-lg font-display">{asset.name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{asset.tokenSymbol}</p>
            </div>
          </div>
          <Badge variant={isPaused ? 'destructive' : 'default'}>
            {isPaused ? 'Paused' : 'Active'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
            <span className="text-sm text-muted-foreground">Trading Fee</span>
            <span className="font-mono font-semibold text-sm">{asset.spread || '0'}%</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-dark-700/50">
            <span className="text-sm text-muted-foreground">Open Interest</span>
            <span className="font-mono font-semibold text-sm">
              {formatCompactNumber(oiValue)} DDSC
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">24h Volume</span>
            <span className="font-mono font-semibold text-sm">
              {asset.volume24h ? formatCompactNumber(parseFloat(asset.volume24h) / 1e6) : '0'} DDSC
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={isPaused ? 'default' : 'destructive'}
            onClick={handleTogglePause}
            disabled={isPausing}
            className="flex-1"
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-2" />
                Pause
              </>
            )}
          </Button>
          <AdjustFeeDialog asset={asset} onUpdate={onUpdate} />
        </div>
      </CardContent>
    </Card>
  );
}

function AdjustFeeDialog({ asset, onUpdate }: AssetCardProps) {
  const [feeBps, setFeeBps] = useState('');
  const [open, setOpen] = useState(false);
  const { writeContract, isLoading } = useContractWrite();

  const handleUpdateFee = async () => {
    if (!feeBps || parseFloat(feeBps) < 0) {
      toast.error('Please enter a valid fee (basis points)');
      return;
    }

    try {
      await writeContract({
        address: CONTRACTS.AssetRegistry.address,
        abi: CONTRACTS.AssetRegistry.abi,
        functionName: 'updateSpread',
        args: [asset.assetId, BigInt(Math.floor(parseFloat(feeBps)))],
      });

      setOpen(false);
      setFeeBps('');
      onUpdate();
    } catch (error) {
      console.error('Update fee failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <DollarSign className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Fee - {asset.name}</DialogTitle>
          <DialogDescription>
            Set the trading fee in basis points (1 bps = 0.01%)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="fee">Fee (basis points)</Label>
            <Input
              id="fee"
              type="number"
              placeholder="e.g., 50 for 0.5%"
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              min="0"
              step="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current: {asset.spread || '0'}% ({((asset.spread || 0) * 100).toFixed(0)} bps)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateFee} disabled={isLoading} className="btn-gold">
            {isLoading ? 'Updating...' : 'Update Fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GlobalControlsCard() {
  const { writeContract: executePauseAll, isLoading: isPausingAll } = useContractWrite();

  const handleEmergencyPause = async () => {
    try {
      await executePauseAll({
        address: CONTRACTS.TradingEngine.address,
        abi: CONTRACTS.TradingEngine.abi,
        functionName: 'pauseTrading',
        args: [],
      });
    } catch (error) {
      console.error('Emergency pause failed:', error);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-xl font-display flex items-center gap-3">
          <Settings className="h-5 w-5 text-gold" />
          Global Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emergency Pause */}
        <div>
          <Label className="text-base mb-2 block">Emergency Controls</Label>
          <Button
            variant="destructive"
            onClick={handleEmergencyPause}
            disabled={isPausingAll}
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {isPausingAll ? 'Pausing...' : 'Pause All Trading'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Immediately halt all buy/sell operations across all assets
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
