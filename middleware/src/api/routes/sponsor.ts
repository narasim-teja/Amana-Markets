/**
 * Sponsorship API Routes
 * Endpoints for requesting gas sponsorship via ERC-4337 paymasters.
 *
 * POST /sponsor/native   → Generate native gas sponsorship
 * POST /sponsor/erc20    → Generate ERC20 gas sponsorship
 * GET  /sponsor/status/:address → Check eligibility and rate limits
 * GET  /sponsor/config   → Return paymaster configuration
 */

import { Hono } from 'hono';
import {
  generateSponsorshipData,
  getSponsorshipStatus,
  getSponsorshipConfig,
  PAYMASTER_ENABLED,
  type SponsorshipMode,
} from '../../services/sponsorship';
import type { Address, Hex } from 'viem';

const app = new Hono();

// POST /sponsor/native - Generate native sponsorship data
app.post('/native', async (c) => {
  if (!PAYMASTER_ENABLED) {
    return c.json({ error: 'Paymaster not enabled. Set PAYMASTER_ENABLED=true in .env' }, 503);
  }

  try {
    const body = await c.req.json<{ sender: string; userOpHash?: string }>();

    if (!body.sender) {
      return c.json({ error: 'Missing required field: sender' }, 400);
    }

    const result = await generateSponsorshipData(
      body.sender as Address,
      'native',
      body.userOpHash as Hex | undefined
    );

    return c.json(result);
  } catch (error: any) {
    console.error('[Sponsor] Native sponsorship error:', error.message);
    return c.json({ error: error.message }, 400);
  }
});

// POST /sponsor/erc20 - Generate ERC20 sponsorship data
app.post('/erc20', async (c) => {
  if (!PAYMASTER_ENABLED) {
    return c.json({ error: 'Paymaster not enabled. Set PAYMASTER_ENABLED=true in .env' }, 503);
  }

  try {
    const body = await c.req.json<{ sender: string; userOpHash?: string }>();

    if (!body.sender) {
      return c.json({ error: 'Missing required field: sender' }, 400);
    }

    const result = await generateSponsorshipData(
      body.sender as Address,
      'erc20',
      body.userOpHash as Hex | undefined
    );

    return c.json(result);
  } catch (error: any) {
    console.error('[Sponsor] ERC20 sponsorship error:', error.message);
    return c.json({ error: error.message }, 400);
  }
});

// GET /sponsor/status/:address - Check sponsorship eligibility
app.get('/status/:address', async (c) => {
  const address = c.req.param('address') as Address;

  try {
    const status = await getSponsorshipStatus(address);
    return c.json(status);
  } catch (error: any) {
    console.error('[Sponsor] Status check error:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET /sponsor/config - Return paymaster configuration
app.get('/config', (c) => {
  return c.json(getSponsorshipConfig());
});

export default app;
