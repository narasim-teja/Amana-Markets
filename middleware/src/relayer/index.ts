import { fetchPythPrices } from './fetchers/pyth';
import { fetchDIAPrices } from './fetchers/dia';
import { fetchRedStonePrices } from './fetchers/redstone';
import { updatePriceOnChain } from './updater';
import { RELAYER_INTERVAL_MS } from '../config/oracles';

async function runRelayerCycle() {
  console.log('\n🔄 Starting relayer cycle...');

  // Fetch from all sources in parallel
  const [pythPrices, diaPrices, redstonePrices] = await Promise.all([
    fetchPythPrices(),
    fetchDIAPrices(),
    fetchRedStonePrices()
  ]);

  console.log(`📊 Fetched: ${pythPrices.length} Pyth, ${diaPrices.length} DIA, ${redstonePrices.length} RedStone`);

  // Push all prices to chain
  const allPrices = [...pythPrices, ...diaPrices, ...redstonePrices];

  for (const price of allPrices) {
    await updatePriceOnChain(price);
  }

  console.log('✅ Relayer cycle complete');
}

export async function startRelayer() {
  console.log('🚀 Oracle Relayer starting...');
  console.log(`⏱️  Update interval: ${RELAYER_INTERVAL_MS}ms`);

  // Run immediately on start
  await runRelayerCycle();

  // Then run on interval
  setInterval(runRelayerCycle, RELAYER_INTERVAL_MS);
}
