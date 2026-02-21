/**
 * Application Constants
 * Centralized constants for the entire application
 */

// ==================== TOKEN DECIMALS ====================

/**
 * DDSC (Dubai Digital Stablecoin) decimals
 */
export const MAED_DECIMALS = 6;

/**
 * Commodity token decimals (xGOLD, xSILVER, xOIL)
 */
export const COMMODITY_DECIMALS = 8;

/**
 * ADI native currency decimals
 */
export const ADI_DECIMALS = 18;

// ==================== ORACLE SETTINGS ====================

/**
 * Price staleness threshold (seconds)
 * Prices older than this are considered stale
 */
export const PRICE_STALENESS_THRESHOLD = 86400; // 24 hours (matches on-chain staleness)

/**
 * Minimum number of oracle sources required
 */
export const MIN_ORACLE_SOURCES = 1;

/**
 * Maximum acceptable price deviation between sources (bps)
 */
export const MAX_PRICE_DEVIATION_BPS = 500; // 5%

// ==================== QUERY REFETCH INTERVALS ====================

/**
 * Fast refetch - for real-time data (prices, positions)
 */
export const REFETCH_INTERVAL_FAST = 5000; // 5 seconds

/**
 * Medium refetch - for semi-real-time data (balances, quotes)
 */
export const REFETCH_INTERVAL_MEDIUM = 15000; // 15 seconds

/**
 * Slow refetch - for static/slow-changing data (analytics, stats)
 */
export const REFETCH_INTERVAL_SLOW = 30000; // 30 seconds

/**
 * Stale time - how long data is considered fresh
 */
export const STALE_TIME_DEFAULT = 5000; // 5 seconds
export const STALE_TIME_ASSETS = 30000; // 30 seconds (assets rarely change)

// ==================== PAGINATION ====================

/**
 * Default page size for lists
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Trades page size
 */
export const TRADES_PAGE_SIZE = 20;

/**
 * Users page size (admin)
 */
export const USERS_PAGE_SIZE = 50;

// ==================== TRANSACTION SETTINGS ====================

/**
 * Gas limit multiplier for safety buffer
 */
export const DEFAULT_GAS_LIMIT_MULTIPLIER = 1.2; // 20% buffer

/**
 * Transaction confirmation timeout (ms)
 */
export const TX_CONFIRMATION_TIMEOUT = 120000; // 2 minutes

/**
 * Maximum approval amount (effectively unlimited)
 */
export const MAX_APPROVAL_AMOUNT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

// ==================== TRADING SETTINGS ====================

/**
 * Basis points denominator (10000 = 100%)
 */
export const BPS_DENOMINATOR = 10000;

/**
 * Default slippage tolerance (bps)
 */
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

/**
 * Quote debounce delay (ms)
 */
export const QUOTE_DEBOUNCE_DELAY = 500;

// ==================== TREASURY SETTINGS ====================

/**
 * Minimum capital deposit amount (DDSC, 6 decimals)
 */
export const MIN_CAPITAL_DEPOSIT = 1000; // 1,000 DDSC

/**
 * Maximum treasury utilization warning threshold (bps)
 */
export const TREASURY_UTILIZATION_WARNING_BPS = 7500; // 75%

// ==================== TESTNET FAUCET ====================

/**
 * Faucet amount for testnet (DDSC, 6 decimals)
 */
export const FAUCET_AMOUNT = 100000; // 100,000 DDSC

/**
 * Faucet cooldown period (seconds)
 */
export const FAUCET_COOLDOWN = 3600; // 1 hour

// ==================== UI SETTINGS ====================

/**
 * Chart height (pixels)
 */
export const CHART_HEIGHT_DEFAULT = 400;
export const CHART_HEIGHT_SMALL = 300;
export const CHART_HEIGHT_LARGE = 500;

/**
 * Toast duration (ms)
 */
export const TOAST_DURATION = 5000;

/**
 * Loading spinner delay (ms)
 */
export const LOADING_DELAY = 300;

// ==================== API ENDPOINTS ====================

/**
 * API base URL (from env or default to localhost)
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==================== EXPLORER LINKS ====================

/**
 * Block explorer base URL
 */
export const EXPLORER_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.ab.testnet.adifoundation.ai';

/**
 * Get transaction URL
 */
export function getTxUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/**
 * Get address URL
 */
export function getAddressUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

/**
 * Get token URL
 */
export function getTokenUrl(tokenAddress: string): string {
  return `${EXPLORER_BASE_URL}/token/${tokenAddress}`;
}
