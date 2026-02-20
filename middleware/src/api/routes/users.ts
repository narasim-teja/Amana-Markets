import { Hono } from 'hono';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

const app = new Hono();

// GET /users - List all known users from indexed events + on-chain events
app.get('/', async (c) => {
  // First check indexed events
  const indexedUsers = db.query(`
    SELECT address, action, MAX(timestamp) as last_updated
    FROM user_events
    GROUP BY address
    ORDER BY last_updated DESC
  `).all() as { address: string; action: string; last_updated: number }[];

  // If indexer has data, return it
  if (indexedUsers.length > 0) {
    return c.json({ users: indexedUsers });
  }

  // Fallback: query on-chain events directly if indexer has no data
  if (!CONTRACTS.UserRegistry) {
    return c.json({ users: [] });
  }

  try {
    const currentBlock = await publicClient.getBlockNumber();
    // Scan last 2000 blocks for user events
    const fromBlock = currentBlock > 2000n ? currentBlock - 2000n : 0n;

    const whitelistedLogs = await publicClient.getLogs({
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
      toBlock: currentBlock
    });

    const blacklistedLogs = await publicClient.getLogs({
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
      toBlock: currentBlock
    });

    // Build latest status per address
    const statusMap = new Map<string, { action: string; last_updated: number }>();

    for (const log of whitelistedLogs) {
      const { user, timestamp } = log.args as any;
      const addr = user.toLowerCase();
      statusMap.set(addr, { action: 'whitelisted', last_updated: Number(timestamp) });
    }

    for (const log of blacklistedLogs) {
      const { user, timestamp } = log.args as any;
      const addr = user.toLowerCase();
      const existing = statusMap.get(addr);
      if (!existing || Number(timestamp) > existing.last_updated) {
        statusMap.set(addr, { action: 'blacklisted', last_updated: Number(timestamp) });
      }
    }

    const users = Array.from(statusMap.entries()).map(([address, data]) => ({
      address,
      action: data.action,
      last_updated: data.last_updated
    }));

    return c.json({ users });
  } catch (error) {
    console.error('Failed to fetch on-chain user events:', error);
    return c.json({ users: [] });
  }
});

// GET /users/:address/whitelist - Check if address is whitelisted
app.get('/:address/whitelist', async (c) => {
  const address = c.req.param('address') as `0x${string}`;

  if (!CONTRACTS.UserRegistry) {
    return c.json({
      error: 'UserRegistry not deployed',
      isWhitelisted: false
    });
  }

  const isWhitelisted = await publicClient.readContract({
    address: CONTRACTS.UserRegistry.address,
    abi: CONTRACTS.UserRegistry.abi,
    functionName: 'isWhitelisted',
    args: [address]
  }) as boolean;

  // Get whitelist history from events
  const history = db.query(`
    SELECT action, timestamp
    FROM user_events
    WHERE address = ?
    ORDER BY timestamp DESC
  `).all(address.toLowerCase());

  return c.json({ address, isWhitelisted, history });
});

export default app;
