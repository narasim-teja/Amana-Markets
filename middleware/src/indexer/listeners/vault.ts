import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

export async function indexVaultEvents(fromBlock: bigint, toBlock: bigint) {
  let totalEvents = 0;

  const insert = db.prepare(`
    INSERT INTO vault_events (
      type, block_number, timestamp, lp, amount, shares,
      asset_id, asset_exposure, total_exposure, tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Deposit events
  const deposits = await publicClient.getLogs({
    address: CONTRACTS.LiquidityVault.address,
    event: {
      type: 'event',
      name: 'Deposit',
      inputs: [
        { indexed: true, name: 'lp', type: 'address' },
        { indexed: false, name: 'amount', type: 'uint256' },
        { indexed: false, name: 'shares', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  for (const log of deposits) {
    const { lp, amount, shares } = log.args as any;
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

    insert.run(
      'deposit',
      Number(log.blockNumber),
      Number(block.timestamp),
      lp.toLowerCase(),
      amount.toString(),
      shares.toString(),
      null, null, null,
      log.transactionHash
    );
  }
  totalEvents += deposits.length;

  // Withdrawal events
  const withdrawals = await publicClient.getLogs({
    address: CONTRACTS.LiquidityVault.address,
    event: {
      type: 'event',
      name: 'Withdrawal',
      inputs: [
        { indexed: true, name: 'lp', type: 'address' },
        { indexed: false, name: 'amount', type: 'uint256' },
        { indexed: false, name: 'shares', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  for (const log of withdrawals) {
    const { lp, amount, shares } = log.args as any;
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

    insert.run(
      'withdrawal',
      Number(log.blockNumber),
      Number(block.timestamp),
      lp.toLowerCase(),
      amount.toString(),
      shares.toString(),
      null, null, null,
      log.transactionHash
    );
  }
  totalEvents += withdrawals.length;

  // Exposure updates
  const exposures = await publicClient.getLogs({
    address: CONTRACTS.LiquidityVault.address,
    event: {
      type: 'event',
      name: 'ExposureUpdated',
      inputs: [
        { indexed: true, name: 'assetId', type: 'bytes32' },
        { indexed: false, name: 'assetExposure', type: 'uint256' },
        { indexed: false, name: 'totalExposure', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  for (const log of exposures) {
    const { assetId, assetExposure, totalExposure } = log.args as any;
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

    insert.run(
      'exposure',
      Number(log.blockNumber),
      Number(block.timestamp),
      null, null, null,
      assetId,
      assetExposure.toString(),
      totalExposure.toString(),
      log.transactionHash
    );
  }
  totalEvents += exposures.length;

  return totalEvents;
}
