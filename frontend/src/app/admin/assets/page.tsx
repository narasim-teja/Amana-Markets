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
import { enrichAssetWithMetadata, type AssetMetadata } from '@/lib/assets';
import { formatCompactNumber } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import {
  Activity,
  Pause,
  Play,
  Settings,
  TrendingUp,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';

export default function AssetsManagementPage() {
  // Fetch assets
  const { data: assetsData, refetch: refetchAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      const assets = response.assets;
      return assets.map((asset: any) => enrichAssetWithMetadata(asset));
    },
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  // Fetch vault stats for exposure data
  const { data: vaultStats } = useQuery({
    queryKey: ['vaultStats'],
    queryFn: () => apiClient.getVaultStats(),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  const assets: AssetMetadata[] = assetsData || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Asset Management</h2>
        <p className="text-muted-foreground">
          Control trading parameters, spreads, and exposure limits
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
            onUpdate={refetchAssets}
          />
        ))}
      </div>

      {/* Vault Utilization Warning */}
      {vaultStats && vaultStats.utilization > 80 && (
        <Card className="premium-card border-warning">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">High Vault Utilization</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vault utilization is at {vaultStats.utilization.toFixed(2)}%. Consider
              adjusting exposure limits or pausing high-risk assets.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: AssetMetadata;
  onUpdate: () => void;
}

function AssetCard({ asset, onUpdate }: AssetCardProps) {
  const { execute: executePause, isLoading: isPausing } = useContractWrite();
  const { execute: executeSpread, isLoading: isUpdatingSpread } = useContractWrite();

  const isPaused = asset.status === 'paused';

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await executePause({
          address: CONTRACTS.AssetRegistry.address,
          abi: CONTRACTS.AssetRegistry.abi,
          functionName: 'unpauseAsset',
          args: [asset.assetId],
          successMessage: `${asset.name} trading resumed`,
        });
      } else {
        await executePause({
          address: CONTRACTS.AssetRegistry.address,
          abi: CONTRACTS.AssetRegistry.abi,
          functionName: 'pauseAsset',
          args: [asset.assetId],
          successMessage: `${asset.name} trading paused`,
        });
      }
      onUpdate();
    } catch (error) {
      console.error('Toggle pause failed:', error);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${asset.color}20` }}
            >
              <Activity className="h-5 w-5" style={{ color: asset.color }} />
            </div>
            <div>
              <CardTitle className="text-lg font-display">{asset.name}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{asset.symbol}</p>
            </div>
          </div>
          <Badge variant={isPaused ? 'destructive' : 'default'}>
            {isPaused ? 'Paused' : 'Active'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Spread</p>
            <p className="font-mono font-semibold">{asset.spread || '0'}%</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Exposure</p>
            <p className="font-mono font-semibold">
              {asset.exposure ? formatCompactNumber(parseFloat(asset.exposure) / 1e6) : '0'} mAED
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Max Exposure</p>
            <p className="font-mono font-semibold">
              {asset.maxExposure
                ? formatCompactNumber(parseFloat(asset.maxExposure) / 1e6)
                : '∞'}{' '}
              mAED
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">24h Volume</p>
            <p className="font-mono font-semibold">
              {asset.volume24h ? formatCompactNumber(parseFloat(asset.volume24h) / 1e6) : '0'} mAED
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
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
          <AdjustSpreadDialog asset={asset} onUpdate={onUpdate} />
          <UpdateLimitsDialog asset={asset} onUpdate={onUpdate} />
        </div>
      </CardContent>
    </Card>
  );
}

function AdjustSpreadDialog({ asset, onUpdate }: AssetCardProps) {
  const [spreadBps, setSpreadBps] = useState('');
  const [open, setOpen] = useState(false);
  const { execute, isLoading } = useContractWrite();

  const handleUpdateSpread = async () => {
    if (!spreadBps || parseFloat(spreadBps) < 0) {
      toast.error('Please enter a valid spread (basis points)');
      return;
    }

    try {
      await execute({
        address: CONTRACTS.AssetRegistry.address,
        abi: CONTRACTS.AssetRegistry.abi,
        functionName: 'updateSpread',
        args: [asset.assetId, BigInt(Math.floor(parseFloat(spreadBps)))],
        successMessage: `Updated ${asset.name} spread to ${parseFloat(spreadBps) / 100}%`,
      });

      setOpen(false);
      setSpreadBps('');
      onUpdate();
    } catch (error) {
      console.error('Update spread failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TrendingUp className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Spread - {asset.name}</DialogTitle>
          <DialogDescription>
            Set the trading spread in basis points (1 bps = 0.01%)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="spread">Spread (basis points)</Label>
            <Input
              id="spread"
              type="number"
              placeholder="e.g., 50 for 0.5%"
              value={spreadBps}
              onChange={(e) => setSpreadBps(e.target.value)}
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
          <Button onClick={handleUpdateSpread} disabled={isLoading} className="btn-gold">
            {isLoading ? 'Updating...' : 'Update Spread'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateLimitsDialog({ asset, onUpdate }: AssetCardProps) {
  const [maxExposure, setMaxExposure] = useState('');
  const [open, setOpen] = useState(false);
  const { execute, isLoading } = useContractWrite();

  const handleUpdateLimits = async () => {
    if (!maxExposure || parseFloat(maxExposure) <= 0) {
      toast.error('Please enter a valid max exposure amount');
      return;
    }

    try {
      // Convert mAED to wei (6 decimals)
      const maxExposureWei = parseUnits(maxExposure, 6);

      await execute({
        address: CONTRACTS.AssetRegistry.address,
        abi: CONTRACTS.AssetRegistry.abi,
        functionName: 'updateExposureLimits',
        args: [asset.assetId, maxExposureWei],
        successMessage: `Updated ${asset.name} max exposure to ${maxExposure} mAED`,
      });

      setOpen(false);
      setMaxExposure('');
      onUpdate();
    } catch (error) {
      console.error('Update limits failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Exposure Limits - {asset.name}</DialogTitle>
          <DialogDescription>
            Set maximum vault exposure for this asset
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="maxExposure">Max Exposure (mAED)</Label>
            <Input
              id="maxExposure"
              type="number"
              placeholder="e.g., 1000000"
              value={maxExposure}
              onChange={(e) => setMaxExposure(e.target.value)}
              min="0"
              step="1000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current:{' '}
              {asset.maxExposure
                ? `${formatCompactNumber(parseFloat(asset.maxExposure) / 1e6)} mAED`
                : 'No limit'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateLimits} disabled={isLoading} className="btn-gold">
            {isLoading ? 'Updating...' : 'Update Limits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GlobalControlsCard() {
  const [fxRate, setFxRate] = useState('');
  const [maxUtilization, setMaxUtilization] = useState('');
  const { execute: executePauseAll, isLoading: isPausingAll } = useContractWrite();
  const { execute: executeFxRate, isLoading: isUpdatingFx } = useContractWrite();
  const { execute: executeUtilization, isLoading: isUpdatingUtil } = useContractWrite();

  const handleEmergencyPause = async () => {
    try {
      await executePauseAll({
        address: CONTRACTS.TradingEngine.address,
        abi: CONTRACTS.TradingEngine.abi,
        functionName: 'pauseTrading',
        args: [],
        successMessage: 'All trading paused',
      });
    } catch (error) {
      console.error('Emergency pause failed:', error);
    }
  };

  const handleUpdateFxRate = async () => {
    if (!fxRate || parseFloat(fxRate) <= 0) {
      toast.error('Please enter a valid FX rate');
      return;
    }

    try {
      // Convert to 8 decimals for oracle precision
      const fxRateWei = parseUnits(fxRate, 8);

      await executeFxRate({
        address: CONTRACTS.OracleRouter.address,
        abi: CONTRACTS.OracleRouter.abi,
        functionName: 'updateFxRate',
        args: [fxRateWei],
        successMessage: `FX rate updated to ${fxRate} AED/USD`,
      });

      setFxRate('');
    } catch (error) {
      console.error('Update FX rate failed:', error);
    }
  };

  const handleUpdateMaxUtilization = async () => {
    if (!maxUtilization || parseFloat(maxUtilization) <= 0 || parseFloat(maxUtilization) > 100) {
      toast.error('Please enter a valid utilization percentage (0-100)');
      return;
    }

    try {
      // Convert percentage to basis points (50% = 5000 bps)
      const utilizationBps = BigInt(Math.floor(parseFloat(maxUtilization) * 100));

      await executeUtilization({
        address: CONTRACTS.LiquidityVault.address,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'updateMaxUtilization',
        args: [utilizationBps],
        successMessage: `Max utilization updated to ${maxUtilization}%`,
      });

      setMaxUtilization('');
    } catch (error) {
      console.error('Update max utilization failed:', error);
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

        {/* FX Rate */}
        <div>
          <Label htmlFor="fxRate" className="text-base mb-2 block">
            AED/USD Exchange Rate
          </Label>
          <div className="flex gap-2">
            <Input
              id="fxRate"
              type="number"
              placeholder="e.g., 3.6725"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              step="0.0001"
            />
            <Button
              onClick={handleUpdateFxRate}
              disabled={isUpdatingFx || !fxRate}
              className="btn-gold"
            >
              {isUpdatingFx ? 'Updating...' : 'Update'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Central bank peg rate for AED to USD conversion
          </p>
        </div>

        {/* Max Vault Utilization */}
        <div>
          <Label htmlFor="maxUtil" className="text-base mb-2 block">
            Max Vault Utilization (%)
          </Label>
          <div className="flex gap-2">
            <Input
              id="maxUtil"
              type="number"
              placeholder="e.g., 85"
              value={maxUtilization}
              onChange={(e) => setMaxUtilization(e.target.value)}
              min="0"
              max="100"
              step="1"
            />
            <Button
              onClick={handleUpdateMaxUtilization}
              disabled={isUpdatingUtil || !maxUtilization}
              className="btn-gold"
            >
              {isUpdatingUtil ? 'Updating...' : 'Update'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Maximum percentage of vault assets that can be used as exposure
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
