'use client';

/**
 * Vault/LP Page
 * Deposit mAED to provide liquidity and earn fees
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { CONTRACTS } from '@/lib/contracts';
import { formatCompactNumber } from '@/lib/format';
import { REFETCH_INTERVAL_FAST } from '@/lib/constants';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Shield,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits, formatUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { adiTestnet } from '@/lib/chain';

export default function VaultPage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');

  // Fetch vault stats
  const { data: vaultStats, refetch: refetchVault } = useQuery({
    queryKey: ['vaultStats'],
    queryFn: () => apiClient.getVaultStats(),
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch user's mAED balance
  const { data: mAedBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['mAedBalance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return '0';

      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      const balance = await publicClient.readContract({
        address: CONTRACTS.MockDirham.address as `0x${string}`,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      return formatUnits(balance as bigint, 6);
    },
    enabled: !!walletAddress,
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch user's vault shares
  const { data: userShares, refetch: refetchShares } = useQuery({
    queryKey: ['vaultShares', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return '0';

      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      const shares = await publicClient.readContract({
        address: CONTRACTS.LiquidityVault.address as `0x${string}`,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'lpShares',
        args: [walletAddress as `0x${string}`],
      });

      return formatUnits(shares as bigint, 6);
    },
    enabled: !!walletAddress,
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  // Fetch total vault shares (totalSupply of vault token)
  const { data: totalSharesStr } = useQuery({
    queryKey: ['vaultTotalShares'],
    queryFn: async () => {
      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      const supply = await publicClient.readContract({
        address: CONTRACTS.LiquidityVault.address as `0x${string}`,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'totalShares',
        args: [],
      });

      return formatUnits(supply as bigint, 6);
    },
    refetchInterval: REFETCH_INTERVAL_FAST,
  });

  const { writeContract: executeApprove, isLoading: isApproving } = useContractWrite();
  const { writeContract: executeDeposit, isLoading: isDepositing } = useContractWrite();
  const { writeContract: executeWithdraw, isLoading: isWithdrawing } = useContractWrite();

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    try {
      const amountWei = parseUnits(depositAmount, 6);

      // Step 1: Approve mAED
      await executeApprove({
        address: CONTRACTS.MockDirham.address,
        abi: CONTRACTS.MockDirham.abi,
        functionName: 'approve',
        args: [CONTRACTS.LiquidityVault.address, amountWei],
      });

      // Step 2: Deposit
      await executeDeposit({
        address: CONTRACTS.LiquidityVault.address,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'deposit',
        args: [amountWei],
      });

      setDepositAmount('');
      refetchVault();
      refetchBalance();
      refetchShares();
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawShares || parseFloat(withdrawShares) <= 0) {
      toast.error('Please enter a valid amount of shares');
      return;
    }

    try {
      const sharesWei = parseUnits(withdrawShares, 6);

      await executeWithdraw({
        address: CONTRACTS.LiquidityVault.address,
        abi: CONTRACTS.LiquidityVault.abi,
        functionName: 'withdraw',
        args: [sharesWei],
      });

      setWithdrawShares('');
      refetchVault();
      refetchBalance();
      refetchShares();
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-display text-gold mb-4">Provide Liquidity</h2>
          <p className="text-muted-foreground mb-8">
            Deposit mAED to earn trading fees as a liquidity provider
          </p>
          <Button onClick={login} size="lg" className="btn-gold">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  const totalAssets = parseFloat(vaultStats?.totalAssets || '0') / 1e6;
  const utilization = vaultStats?.utilization || 0;
  const userSharesNum = parseFloat(userShares || '0');
  const totalShares = parseFloat(totalSharesStr || '1');
  const userSharePercent = totalShares > 0 ? (userSharesNum / totalShares) * 100 : 0;
  const userValue = totalShares > 0 ? (userSharesNum / totalShares) * totalAssets : 0;

  // Estimate APR (simplified - in production, calculate from historical fees)
  const estimatedAPR = 8.5; // 8.5% APR placeholder

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">Liquidity Vault</h2>
        <p className="text-muted-foreground">
          Provide liquidity to earn trading fees from commodity trades
        </p>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value Locked
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{formatCompactNumber(totalAssets)} mAED</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilization
            </CardTitle>
            <Shield className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{utilization.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Est. APR
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{estimatedAPR.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Position
            </CardTitle>
            <Wallet className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">
              {userSharesNum > 0 ? userValue.toFixed(2) : '0.00'} mAED
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Bar */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-lg font-display">Vault Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={utilization} className="h-4" />
            </div>
            <span className="font-mono text-lg font-semibold text-gold min-w-[80px] text-right">
              {utilization.toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {utilization < 80
              ? 'Vault is healthy with available capacity'
              : 'High utilization - earnings may be higher'}
          </p>
        </CardContent>
      </Card>

      {/* Deposit/Withdraw Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-5 w-5 text-success" />
              <CardTitle className="text-xl font-display">Deposit Liquidity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="depositAmount">Amount (mAED)</Label>
              <Input
                id="depositAmount"
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                step="0.01"
                min="0"
                className="text-xl font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {parseFloat(mAedBalance || '0').toFixed(2)} mAED
              </p>
            </div>

            {depositAmount && parseFloat(depositAmount) > 0 && (
              <div className="p-3 bg-dark-800/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You will receive:</span>
                  <span className="font-mono font-semibold">
                    ≈ {depositAmount} shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool share:</span>
                  <span className="font-mono">
                    ≈{' '}
                    {(
                      (parseFloat(depositAmount) / (totalAssets + parseFloat(depositAmount))) *
                      100
                    ).toFixed(4)}
                    %
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing || isApproving}
              className="w-full bg-success hover:bg-success/90"
              size="lg"
            >
              {isApproving
                ? 'Approving...'
                : isDepositing
                ? 'Depositing...'
                : 'Deposit mAED'}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your deposit will earn a share of trading fees proportional to your stake in the
                vault.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-xl font-display">Withdraw Liquidity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="withdrawShares">Shares to Redeem</Label>
              <Input
                id="withdrawShares"
                type="number"
                placeholder="0.00"
                value={withdrawShares}
                onChange={(e) => setWithdrawShares(e.target.value)}
                step="0.01"
                min="0"
                className="text-xl font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your shares: {parseFloat(userShares || '0').toFixed(2)}
              </p>
            </div>

            {withdrawShares && parseFloat(withdrawShares) > 0 && totalShares > 0 && (
              <div className="p-3 bg-dark-800/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You will receive:</span>
                  <span className="font-mono font-semibold">
                    ≈{' '}
                    {((parseFloat(withdrawShares) / totalShares) * totalAssets).toFixed(2)}{' '}
                    mAED
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={
                !withdrawShares ||
                parseFloat(withdrawShares) <= 0 ||
                parseFloat(withdrawShares) > userSharesNum ||
                isWithdrawing
              }
              className="w-full bg-destructive hover:bg-destructive/90"
              size="lg"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw mAED'}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Info className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Withdrawing reduces your share of future trading fees. There may be a small
                slippage if vault utilization is high.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your LP Position */}
      {userSharesNum > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-xl font-display">Your LP Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Shares</p>
                <p className="font-mono text-2xl font-semibold">{parseFloat(userShares || '0').toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Position Value</p>
                <p className="font-mono text-2xl font-semibold text-gold">
                  {userValue.toFixed(2)} mAED
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pool Share</p>
                <p className="font-mono text-2xl font-semibold">
                  {userSharePercent.toFixed(4)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Est. Annual Earnings</p>
                <p className="font-mono text-2xl font-semibold text-success">
                  {(userValue * (estimatedAPR / 100)).toFixed(2)} mAED
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
