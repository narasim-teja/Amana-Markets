import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, http } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { adiTestnet } from '@/lib/chain';
import { REFETCH_INTERVAL_FAST } from '@/lib/constants';
import { useSmartAccount } from '@/hooks/blockchain/use-smart-account';

interface Position {
  assetId: string;
  commodityBalance: string; // Raw BigInt as string (18 decimals) - use formatCommodityPrice() to display
  costBasis: string; // Raw BigInt as string (6 decimals) - use formatAED() to display
  currentValue: string; // Raw BigInt as string (6 decimals)
  pnl: string; // Profit/Loss in stablecoin
  pnlPercent: number; // P&L percentage
}

export function usePosition(assetId: string | null, tokenAddress: string | null) {
  const { authenticated } = usePrivy();
  const { displayAddress: walletAddress } = useSmartAccount();

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

      const rawBalance = (balance as bigint).toString();

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

        return {
          assetId,
          commodityBalance: rawBalance,
          costBasis: costBasis.toString(),
          currentValue: '0',
          pnl: '0',
          pnlPercent: 0,
        } as Position;
      } catch (error) {
        console.error('Failed to get position data:', error);
        // Return just the balance if position fetch fails
        return {
          assetId,
          commodityBalance: rawBalance,
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
