import { useState, useEffect } from 'react';
import { createPublicClient, http, parseUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { adiTestnet } from '@/lib/chain';

interface QuoteResult {
  totalCost: bigint;
  effectivePrice: bigint;
  spread: bigint;
  fee: bigint;
  isLoading: boolean;
  error: string | null;
}

export function useQuote(
  assetId: string | null,
  isBuy: boolean,
  amount: string,
  debounceMs: number = 500
) {
  const [quote, setQuote] = useState<QuoteResult>({
    totalCost: 0n,
    effectivePrice: 0n,
    spread: 0n,
    fee: 0n,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!assetId || !amount || parseFloat(amount) <= 0) {
      setQuote({
        totalCost: 0n,
        effectivePrice: 0n,
        spread: 0n,
        fee: 0n,
        isLoading: false,
        error: null,
      });
      return;
    }

    setQuote((prev) => ({ ...prev, isLoading: true, error: null }));

    const timeoutId = setTimeout(async () => {
      try {
        const publicClient = createPublicClient({
          chain: adiTestnet,
          transport: http(),
        });

        // Convert amount to commodity decimals (8 decimals)
        const amountWei = parseUnits(amount, 8);

        const functionName = isBuy ? 'quoteBuy' : 'quoteSell';

        const result = await publicClient.readContract({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName,
          args: [assetId, amountWei],
        });

        // Result is the total cost in stablecoin (6 decimals)
        setQuote({
          totalCost: result as bigint,
          effectivePrice: 0n, // TODO: Calculate from result
          spread: 0n, // TODO: Get from contract if available
          fee: 0n, // TODO: Calculate fee
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        console.error('Quote failed:', error);
        setQuote({
          totalCost: 0n,
          effectivePrice: 0n,
          spread: 0n,
          fee: 0n,
          isLoading: false,
          error: error.message || 'Failed to get quote',
        });
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [assetId, isBuy, amount, debounceMs]);

  return quote;
}
