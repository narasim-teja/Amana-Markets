import { publicClient } from '../lib/viem';
import { db } from '../lib/db';
import { indexTradeEvents } from './listeners/trading';
import { indexVaultEvents } from './listeners/vault';
import { indexOracleEvents } from './listeners/oracle';
import { indexAssetEvents } from './listeners/assets';
import { indexUserEvents } from './listeners/users';

const POLL_INTERVAL = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000');
const BATCH_SIZE = 1000n; // Process 1000 blocks at a time

function getLastIndexedBlock(): bigint {
  const result = db.query('SELECT last_block FROM indexer_state WHERE id = 1').get() as { last_block: number };
  return BigInt(result.last_block);
}

function setLastIndexedBlock(block: bigint) {
  db.run('UPDATE indexer_state SET last_block = ? WHERE id = 1', Number(block));
}

async function indexBlockRange(fromBlock: bigint, toBlock: bigint) {
  console.log(`📦 Indexing blocks ${fromBlock} → ${toBlock}...`);

  const [trades, vault, oracle, assets, users] = await Promise.all([
    indexTradeEvents(fromBlock, toBlock),
    indexVaultEvents(fromBlock, toBlock),
    indexOracleEvents(fromBlock, toBlock),
    indexAssetEvents(fromBlock, toBlock),
    indexUserEvents(fromBlock, toBlock)
  ]);

  console.log(`✅ Indexed: ${trades} trades, ${vault} vault, ${oracle} oracle, ${assets} assets, ${users} users`);

  setLastIndexedBlock(toBlock);
}

async function runIndexerCycle() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    let lastIndexed = getLastIndexedBlock();

    // If starting from 0, use configured start block
    if (lastIndexed === 0n) {
      const startBlock = BigInt(process.env.INDEXER_START_BLOCK || '0');
      lastIndexed = startBlock > 0n ? startBlock - 1n : 0n;
    }

    if (currentBlock > lastIndexed) {
      const toBlock = lastIndexed + BATCH_SIZE > currentBlock
        ? currentBlock
        : lastIndexed + BATCH_SIZE;

      await indexBlockRange(lastIndexed + 1n, toBlock);
    }
  } catch (error) {
    console.error('❌ Indexer cycle failed:', error);
  }
}

export async function startIndexer() {
  console.log('🚀 Event Indexer starting...');
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`📦 Batch size: ${BATCH_SIZE} blocks`);

  // Run immediately on start
  await runIndexerCycle();

  // Then poll for new blocks
  setInterval(runIndexerCycle, POLL_INTERVAL);
}
