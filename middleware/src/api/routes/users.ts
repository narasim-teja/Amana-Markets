import { Hono } from 'hono';
import { publicClient } from '../../lib/viem';
import { CONTRACTS } from '../../config/contracts';
import { db } from '../../lib/db';

const app = new Hono();

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
