import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

export async function indexAssetEvents(fromBlock: bigint, toBlock: bigint) {
  let totalEvents = 0;

  // AssetAdded
  const added = await publicClient.getLogs({
    address: CONTRACTS.AssetRegistry.address,
    event: {
      type: 'event',
      name: 'AssetAdded',
      inputs: [
        { indexed: true, name: 'assetId', type: 'bytes32' },
        { indexed: false, name: 'name', type: 'string' },
        { indexed: false, name: 'symbol', type: 'string' },
        { indexed: false, name: 'tokenAddress', type: 'address' }
      ]
    },
    fromBlock,
    toBlock
  });

  const insertAsset = db.prepare(`
    INSERT OR REPLACE INTO assets (
      asset_id, name, symbol, token_address, block_number, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const log of added) {
    const { assetId, name, symbol, tokenAddress } = log.args as any;
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

    insertAsset.run(
      assetId,
      name,
      symbol,
      tokenAddress.toLowerCase(),
      Number(log.blockNumber),
      Number(block.timestamp)
    );
  }
  totalEvents += added.length;

  // AssetPaused/Unpaused
  const updatePaused = db.prepare(`UPDATE assets SET is_paused = ? WHERE asset_id = ?`);

  const paused = await publicClient.getLogs({
    address: CONTRACTS.AssetRegistry.address,
    event: {
      type: 'event',
      name: 'AssetPaused',
      inputs: [{ indexed: true, name: 'assetId', type: 'bytes32' }]
    },
    fromBlock,
    toBlock
  });

  for (const log of paused) {
    updatePaused.run(1, log.args.assetId);
  }
  totalEvents += paused.length;

  const unpaused = await publicClient.getLogs({
    address: CONTRACTS.AssetRegistry.address,
    event: {
      type: 'event',
      name: 'AssetUnpaused',
      inputs: [{ indexed: true, name: 'assetId', type: 'bytes32' }]
    },
    fromBlock,
    toBlock
  });

  for (const log of unpaused) {
    updatePaused.run(0, log.args.assetId);
  }
  totalEvents += unpaused.length;

  return totalEvents;
}
