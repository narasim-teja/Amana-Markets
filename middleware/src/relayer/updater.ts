import { publicClient, walletClient } from '../lib/viem';
import { CONTRACTS } from '../config/contracts';
import type { PriceData } from '../lib/types';
import { PRICE_STALENESS_SECONDS } from '../config/oracles';
import { isStale } from '../lib/utils';

const ADAPTER_MAP: Record<string, any> = {
  'Pyth': CONTRACTS.PythAdapter,
  'DIA': CONTRACTS.DIAAdapter,
  'RedStone': CONTRACTS.RedStoneAdapter,
  'Yahoo': CONTRACTS.ManualAdapter,
};

export async function updatePriceOnChain(priceData: PriceData): Promise<void> {
  if (!walletClient) {
    console.warn('⚠️  No wallet client - skipping price update');
    return;
  }

  if (isStale(priceData.timestamp, PRICE_STALENESS_SECONDS)) {
    console.warn(`⚠️  Price too stale for ${priceData.source}, skipping`);
    return;
  }

  const adapter = ADAPTER_MAP[priceData.source];
  if (!adapter) {
    console.warn(`⚠️  Unknown adapter for ${priceData.source}`);
    return;
  }

  try {
    // Check current on-chain price first
    const currentPrice = await publicClient.readContract({
      address: adapter.address,
      abi: adapter.abi,
      functionName: 'getPrice',
      args: [priceData.assetId]
    }) as { price: bigint; timestamp: bigint };

    // Only update if new price is fresher
    if (priceData.timestamp <= Number(currentPrice.timestamp)) {
      console.log(`✓ ${priceData.source} price already up-to-date for asset ${priceData.assetId.slice(0, 10)}...`);
      return;
    }

    // Send update transaction
    const hash = await walletClient.writeContract({
      address: adapter.address,
      abi: adapter.abi,
      functionName: 'updatePrice',
      args: [priceData.assetId, priceData.price, BigInt(priceData.timestamp)]
    });

    console.log(`✅ Updated ${priceData.source} price for asset ${priceData.assetId.slice(0, 10)}... | tx: ${hash}`);

    // Wait for confirmation (with timeout handling)
    try {
      await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
      console.log(`  ✓ Confirmed`);
    } catch (timeoutError) {
      console.warn(`  ⚠️  Confirmation timeout (tx may still succeed later)`);
    }
  } catch (error) {
    console.error(`❌ Failed to update ${priceData.source} price:`, error);
  }
}
