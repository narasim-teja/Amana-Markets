import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

export async function indexUserEvents(fromBlock: bigint, toBlock: bigint) {
  if (!CONTRACTS.UserRegistry) {
    return 0; // Skip if UserRegistry not deployed
  }

  let totalEvents = 0;

  const insert = db.prepare(`
    INSERT INTO user_events (address, action, timestamp, block_number, tx_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Whitelisted
  const whitelisted = await publicClient.getLogs({
    address: CONTRACTS.UserRegistry.address,
    event: {
      type: 'event',
      name: 'UserWhitelisted',
      inputs: [
        { indexed: true, name: 'user', type: 'address' },
        { indexed: false, name: 'timestamp', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  for (const log of whitelisted) {
    const { user, timestamp } = log.args as any;
    insert.run(user.toLowerCase(), 'whitelisted', Number(timestamp), Number(log.blockNumber), log.transactionHash);
  }
  totalEvents += whitelisted.length;

  // Blacklisted
  const blacklisted = await publicClient.getLogs({
    address: CONTRACTS.UserRegistry.address,
    event: {
      type: 'event',
      name: 'UserBlacklisted',
      inputs: [
        { indexed: true, name: 'user', type: 'address' },
        { indexed: false, name: 'timestamp', type: 'uint256' }
      ]
    },
    fromBlock,
    toBlock
  });

  for (const log of blacklisted) {
    const { user, timestamp } = log.args as any;
    insert.run(user.toLowerCase(), 'blacklisted', Number(timestamp), Number(log.blockNumber), log.transactionHash);
  }
  totalEvents += blacklisted.length;

  return totalEvents;
}
