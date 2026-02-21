import { fetchPythPrices } from './fetchers/pyth';
import { fetchDIAPrices } from './fetchers/dia';
import { fetchRedStonePrices } from './fetchers/redstone';
import { fetchYahooPrices } from './fetchers/yahoo';
import { updatePriceOnChain } from './updater';
import { RELAYER_INTERVAL_MS } from '../config/oracles';

async function runRelayerCycle() {
  console.log('\n🔄 Starting relayer cycle...');

  // Fetch from all 4 sources in parallel
  const [pythPrices, diaPrices, redstonePrices, yahooPrices] = await Promise.all([
    fetchPythPrices(),
    fetchDIAPrices(),
    fetchRedStonePrices(),
    fetchYahooPrices()
  ]);

  console.log(`📊 Fetched: ${pythPrices.length} Pyth, ${diaPrices.length} DIA, ${redstonePrices.length} RedStone, ${yahooPrices.length} Yahoo`);

  // Push all prices to chain
  const allPrices = [...pythPrices, ...diaPrices, ...redstonePrices, ...yahooPrices];

  for (const price of allPrices) {
    await updatePriceOnChain(price);
  }

  console.log(`✅ Relayer cycle complete — ${allPrices.length} prices processed`);
}

export async function startRelayer() {
  if (process.env.DISABLE_PRICE_RELAY === 'true') {
    console.log('Oracle Relayer disabled (DISABLE_PRICE_RELAY=true). Live price API still active.');
    return;
  }

  console.log('🚀 Oracle Relayer starting...');
  console.log(`⏱️  Update interval: ${RELAYER_INTERVAL_MS}ms (${RELAYER_INTERVAL_MS / 60000} min)`);

  // Run immediately on start
  await runRelayerCycle();

  // Then run on interval
  setInterval(runRelayerCycle, RELAYER_INTERVAL_MS);
}
