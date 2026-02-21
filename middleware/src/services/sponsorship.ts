/**
 * Sponsorship Service
 * Backend-controlled sponsor signer for ERC-4337 paymaster authorization.
 *
 * When PAYMASTER_ENABLED=true, this service:
 * - Checks user eligibility (whitelist via UserRegistry)
 * - Enforces rate limits (per-account, per-hour)
 * - Signs sponsorship authorization for paymasterAndData
 * - Tracks sponsorship requests in SQLite
 */

import { privateKeyToAccount } from 'viem/accounts';
import { encodePacked, keccak256, encodeAbiParameters, parseAbiParameters, toHex, type Address, type Hex } from 'viem';
import { publicClient } from '../lib/viem';
import { CONTRACTS } from '../config/contracts';
import { db } from '../lib/db';

// ──────────────────────── Config ────────────────────────────

export const PAYMASTER_ENABLED = process.env.PAYMASTER_ENABLED === 'true';

const SPONSOR_SIGNER_KEY = process.env.SPONSOR_SIGNER_KEY as Hex | undefined;
const NATIVE_PAYMASTER = process.env.NATIVE_PAYMASTER as Address | undefined;
const ERC20_PAYMASTER = process.env.ERC20_PAYMASTER as Address | undefined;
const ENTRYPOINT = process.env.ENTRYPOINT as Address | undefined;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '99999');
const VALIDITY_SECONDS = parseInt(process.env.SPONSORSHIP_VALIDITY_SECONDS || '300');
const HOURLY_CAP = parseInt(process.env.DEFAULT_SPEND_CAP_PER_HOUR || '10');

// Sponsor signer account (loaded once)
const sponsorAccount = SPONSOR_SIGNER_KEY
  ? privateKeyToAccount(SPONSOR_SIGNER_KEY)
  : null;

// ──────────────────────── Nonce Counter ─────────────────────

let nonceCounter = Date.now(); // Simple incrementing nonce

function getNextNonce(): number {
  return nonceCounter++;
}

// ──────────────────────── Eligibility ───────────────────────

export async function checkEligibility(account: Address): Promise<{ eligible: boolean; reason?: string }> {
  if (!PAYMASTER_ENABLED) {
    return { eligible: false, reason: 'Paymaster not enabled' };
  }

  // Check UserRegistry whitelist if available
  if (CONTRACTS.UserRegistry) {
    try {
      const isWhitelisted = await publicClient.readContract({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'isWhitelisted',
        args: [account]
      }) as boolean;

      if (!isWhitelisted) {
        return { eligible: false, reason: 'Account not whitelisted' };
      }
    } catch (e) {
      // If UserRegistry check fails, allow by default (testnet permissive)
      console.warn('UserRegistry check failed, allowing by default:', e);
    }
  }

  return { eligible: true };
}

// ──────────────────────── Rate Limiting ─────────────────────

export function checkRateLimit(account: string): { allowed: boolean; used: number; limit: number } {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

  const result = db.query(
    `SELECT COUNT(*) as count FROM sponsorship_requests WHERE account = ? AND created_at > ?`
  ).get(account.toLowerCase(), oneHourAgo) as { count: number } | null;

  const used = result?.count || 0;

  return {
    allowed: used < HOURLY_CAP,
    used,
    limit: HOURLY_CAP
  };
}

// ──────────────────────── Sponsorship Hash ──────────────────

function getSponsorshipHash(
  mode: number,
  validUntil: number,
  validAfter: number,
  account: Address,
  sponsorNonce: bigint,
  chainId: number,
  entryPoint: Address,
  paymaster: Address
): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('uint8, uint48, uint48, address, uint256, uint256, address, address'),
      [mode, validUntil, validAfter, account, sponsorNonce, BigInt(chainId), entryPoint, paymaster]
    )
  );
}

// ──────────────────────── Generate Sponsorship ──────────────

export type SponsorshipMode = 'native' | 'erc20';

export interface SponsorshipResult {
  paymasterAndData: Hex;
  validUntil: number;
  validAfter: number;
  mode: SponsorshipMode;
  paymaster: Address;
  sponsorNonce: number;
}

export async function generateSponsorshipData(
  account: Address,
  mode: SponsorshipMode,
  userOpHash?: Hex
): Promise<SponsorshipResult> {
  if (!PAYMASTER_ENABLED || !sponsorAccount || !ENTRYPOINT) {
    throw new Error('Paymaster not configured');
  }

  const paymaster = mode === 'native' ? NATIVE_PAYMASTER : ERC20_PAYMASTER;
  if (!paymaster) {
    throw new Error(`${mode} paymaster address not configured`);
  }

  // Check eligibility
  const eligibility = await checkEligibility(account);
  if (!eligibility.eligible) {
    throw new Error(`Not eligible: ${eligibility.reason}`);
  }

  // Check rate limit
  const rateLimit = checkRateLimit(account);
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimit.used}/${rateLimit.limit} per hour`);
  }

  // Build timestamps
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now;
  const validUntil = now + VALIDITY_SECONDS;

  // Get nonce
  const sponsorNonce = getNextNonce();

  // Mode byte
  const modeByte = mode === 'native' ? 0 : 1;

  // Compute hash
  const hash = getSponsorshipHash(
    modeByte,
    validUntil,
    validAfter,
    account,
    BigInt(sponsorNonce),
    CHAIN_ID,
    ENTRYPOINT,
    paymaster
  );

  // Sign (EthSignedMessageHash — matches Solidity's toEthSignedMessageHash)
  const signature = await sponsorAccount.signMessage({
    message: { raw: hash }
  });

  // Encode custom paymaster data:
  // mode(1) + validUntil(6) + validAfter(6) + sponsorNonce(32) + signature(65) = 110 bytes
  const customData = encodePacked(
    ['uint8', 'uint48', 'uint48', 'uint256', 'bytes'],
    [modeByte, validUntil, validAfter, BigInt(sponsorNonce), signature]
  );

  // Full paymasterAndData:
  // paymaster(20) + validationGasLimit(16) + postOpGasLimit(16) + customData(110)
  const paymasterVerificationGas = BigInt(200_000);
  const paymasterPostOpGas = BigInt(100_000);

  const paymasterAndData = encodePacked(
    ['address', 'uint128', 'uint128', 'bytes'],
    [paymaster, paymasterVerificationGas, paymasterPostOpGas, customData]
  );

  // Record in DB
  db.run(
    `INSERT INTO sponsorship_requests (account, mode, nonce, valid_until, created_at, user_op_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, 'issued')`,
    [account.toLowerCase(), mode, sponsorNonce, validUntil, now, userOpHash || null]
  );

  return {
    paymasterAndData,
    validUntil,
    validAfter,
    mode,
    paymaster,
    sponsorNonce
  };
}

// ──────────────────────── Status Query ──────────────────────

export interface SponsorshipStatus {
  eligible: boolean;
  whitelisted: boolean;
  sponsoredThisHour: number;
  hourlyLimit: number;
  totalSponsored: number;
  paymasterEnabled: boolean;
}

export async function getSponsorshipStatus(account: Address): Promise<SponsorshipStatus> {
  if (!PAYMASTER_ENABLED) {
    return {
      eligible: false,
      whitelisted: false,
      sponsoredThisHour: 0,
      hourlyLimit: HOURLY_CAP,
      totalSponsored: 0,
      paymasterEnabled: false
    };
  }

  const eligibility = await checkEligibility(account);
  const rateLimit = checkRateLimit(account);

  const totalResult = db.query(
    `SELECT COUNT(*) as count FROM sponsorship_requests WHERE account = ?`
  ).get(account.toLowerCase()) as { count: number } | null;

  return {
    eligible: eligibility.eligible && rateLimit.allowed,
    whitelisted: eligibility.eligible,
    sponsoredThisHour: rateLimit.used,
    hourlyLimit: rateLimit.limit,
    totalSponsored: totalResult?.count || 0,
    paymasterEnabled: true
  };
}

// ──────────────────────── Config Query ──────────────────────

export function getSponsorshipConfig() {
  return {
    enabled: PAYMASTER_ENABLED,
    nativePaymaster: NATIVE_PAYMASTER || null,
    erc20Paymaster: ERC20_PAYMASTER || null,
    entryPoint: ENTRYPOINT || null,
    bundlerUrl: process.env.BUNDLER_URL || 'http://localhost:4337',
    chainId: CHAIN_ID,
    supportedModes: [
      ...(NATIVE_PAYMASTER ? ['native'] : []),
      ...(ERC20_PAYMASTER ? ['erc20'] : [])
    ],
    validitySeconds: VALIDITY_SECONDS,
    hourlyLimit: HOURLY_CAP
  };
}
