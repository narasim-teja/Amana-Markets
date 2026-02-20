import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

const ADAPTERS = [
  { name: 'Pyth', contract: CONTRACTS.PythAdapter },
  { name: 'DIA', contract: CONTRACTS.DIAAdapter },
  { name: 'RedStone', contract: CONTRACTS.RedStoneAdapter }
];

export async function indexOracleEvents(fromBlock: bigint, toBlock: bigint) {
  let totalEvents = 0;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO prices (
      asset_id, source, price, timestamp, block_number, tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const adapter of ADAPTERS) {
    const logs = await publicClient.getLogs({
      address: adapter.contract.address,
      event: {
        type: 'event',
        name: 'PriceUpdated',
        inputs: [
          { indexed: true, name: 'assetId', type: 'bytes32' },
          { indexed: false, name: 'price', type: 'uint256' },
          { indexed: false, name: 'timestamp', type: 'uint256' },
          { indexed: false, name: 'source', type: 'string' }
        ]
      },
      fromBlock,
      toBlock
    });

    for (const log of logs) {
      const { assetId, price, timestamp } = log.args as any;

      insert.run(
        assetId,
        adapter.name,
        price.toString(),
        Number(timestamp),
        Number(log.blockNumber),
        log.transactionHash
      );
    }

    totalEvents += logs.length;
  }

  return totalEvents;
}
