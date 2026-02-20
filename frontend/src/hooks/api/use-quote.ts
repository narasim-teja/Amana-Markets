import { useState, useEffect } from 'react';
import { createPublicClient, http, parseUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { adiTestnet } from '@/lib/chain';

interface QuoteResult {
  /** For buy: tokensOut (18 dec). For sell: stablecoinOut (6 dec). */
  outputAmount: bigint;
  effectivePrice: bigint;
  spreadBps: bigint;
  fee: bigint;
  isLoading: boolean;
  error: string | null;
}

const EMPTY: QuoteResult = {
  outputAmount: BigInt(0),
  effectivePrice: BigInt(0),
  spreadBps: BigInt(0),
  fee: BigInt(0),
  isLoading: false,
  error: null,
};

/**
 * Get a buy or sell quote from TradingEngine.
 *
 * Buy flow:  user enters mAED amount  → quoteBuy(assetId, stablecoinAmount)
 *            returns (tokensOut, effectivePrice, spreadBps, fee)
 *
 * Sell flow: user enters token amount  → quoteSell(assetId, tokenAmount)
 *            returns (stablecoinOut, effectivePrice, spreadBps, fee)
 */
export function useQuote(
  assetId: string | null,
  isBuy: boolean,
  amount: string,
  debounceMs: number = 500
) {
  const [quote, setQuote] = useState<QuoteResult>(EMPTY);

  useEffect(() => {
    if (!assetId || !amount || parseFloat(amount) <= 0) {
      setQuote(EMPTY);
      return;
    }

    setQuote((prev) => ({ ...prev, isLoading: true, error: null }));

    const timeoutId = setTimeout(async () => {
      try {
        const publicClient = createPublicClient({
          chain: adiTestnet,
          transport: http(),
        });

        // Buy: input is mAED (6 decimals).  Sell: input is commodity tokens (18 decimals).
        const decimals = isBuy ? 6 : 18;
        const amountWei = parseUnits(amount, decimals);

        const functionName = isBuy ? 'quoteBuy' : 'quoteSell';

        const result = await publicClient.readContract({
          address: CONTRACTS.TradingEngine.address,
          abi: CONTRACTS.TradingEngine.abi,
          functionName,
          args: [assetId, amountWei],
        });

        // Both quoteBuy and quoteSell return a tuple:
        // (uint256 output, uint256 effectivePrice, uint256 spreadBps, uint256 fee)
        const tuple = result as readonly [bigint, bigint, bigint, bigint];

        setQuote({
          outputAmount: tuple[0],
          effectivePrice: tuple[1],
          spreadBps: tuple[2],
          fee: tuple[3],
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        console.error('Quote failed:', error);
        setQuote({
          ...EMPTY,
          isLoading: false,
          error: error.message || 'Failed to get quote',
        });
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [assetId, isBuy, amount, debounceMs]);

  return quote;
}
