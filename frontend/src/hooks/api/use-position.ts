import { useQuery } from '@tanstack/react-query';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, http, formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { adiTestnet } from '@/lib/chain';
import { REFETCH_INTERVAL_FAST } from '@/lib/constants';

interface Position {
  assetId: string;
  commodityBalance: string; // In commodity decimals (8)
  costBasis: string; // In stablecoin decimals (6)
  currentValue: string; // In stablecoin decimals (6)
  pnl: string; // Profit/Loss in stablecoin
  pnlPercent: number; // P&L percentage
}

export function usePosition(assetId: string | null, tokenAddress: string | null) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  return useQuery({
    queryKey: ['position', assetId, walletAddress],
    queryFn: async () => {
      if (!walletAddress || !assetId || !tokenAddress) {
        return null;
      }

      const publicClient = createPublicClient({
        chain: adiTestnet,
        transport: http(),
      });

      // Get commodity token balance
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
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

      const commodityBalance = formatUnits(balance as bigint, 8);

      // Get position data from trading engine
      try {
        const positionData = await publicClient.readContract({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName: 'getPosition',
          args: [walletAddress as `0x${string}`, assetId as `0x${string}`],
        });

        // Position structure: [balance, costBasis]
        const [posBalance, costBasis] = positionData as [bigint, bigint];

        // For now, return basic data
        // TODO: Calculate current value and PnL with live price
        return {
          assetId,
          commodityBalance,
          costBasis: formatUnits(costBasis, 6),
          currentValue: '0', // TODO: Fetch current price and calculate
          pnl: '0',
          pnlPercent: 0,
        } as Position;
      } catch (error) {
        console.error('Failed to get position data:', error);
        // Return just the balance if position fetch fails
        return {
          assetId,
          commodityBalance,
          costBasis: '0',
          currentValue: '0',
          pnl: '0',
          pnlPercent: 0,
        } as Position;
      }
    },
    enabled: authenticated && !!walletAddress && !!assetId && !!tokenAddress,
    refetchInterval: REFETCH_INTERVAL_FAST,
  });
}
