/**
 * Formatting Utilities
 * Price, number, timestamp, and address formatting functions
 */

import { formatUnits, parseUnits } from 'viem';

// ==================== PRICE FORMATTING ====================

/**
 * Format commodity price (8 decimals)
 * Converts BigInt to human-readable string with 2 decimal places
 */
export function formatCommodityPrice(value: bigint | string): string {
  const bigIntValue = typeof value === 'string' ? BigInt(value) : value;
  return parseFloat(formatUnits(bigIntValue, 8)).toFixed(2);
}

/**
 * Format mAED amount (6 decimals)
 * Converts BigInt to human-readable string with 2 decimal places
 */
export function formatAED(value: bigint | string): string {
  const bigIntValue = typeof value === 'string' ? BigInt(value) : value;
  return parseFloat(formatUnits(bigIntValue, 6)).toFixed(2);
}

/**
 * Format ADI (native currency, 18 decimals)
 */
export function formatADI(value: bigint | string): string {
  const bigIntValue = typeof value === 'string' ? BigInt(value) : value;
  return parseFloat(formatUnits(bigIntValue, 18)).toFixed(4);
}

/**
 * Parse commodity amount string to BigInt (8 decimals)
 */
export function parseCommodityAmount(value: string): bigint {
  return parseUnits(value, 8);
}

/**
 * Parse AED amount string to BigInt (6 decimals)
 */
export function parseAEDAmount(value: string): bigint {
  return parseUnits(value, 6);
}

// ==================== NUMBER FORMATTING ====================

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format percentage with specified decimals
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format basis points as percentage
 */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Format number with thousands separators
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ==================== TIMESTAMP FORMATTING ====================

/**
 * Format unix timestamp to human-readable date/time
 */
export function formatTimestamp(timestamp: number, includeTime = true): string {
  const date = new Date(timestamp * 1000); // Unix timestamp to JS timestamp

  if (includeTime) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 0) return 'in the future';
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatTimestamp(timestamp, false);
}

/**
 * Check if timestamp is within last N seconds
 */
export function isRecent(timestamp: number, thresholdSeconds = 120): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - timestamp) <= thresholdSeconds;
}

// ==================== ADDRESS FORMATTING ====================

/**
 * Shorten Ethereum address (0x1234...5678)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ==================== PRICE-SPECIFIC UTILITIES ====================

/**
 * Check if price is stale (older than threshold)
 */
export function isPriceStale(timestamp: number, thresholdSeconds = 120): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - timestamp) > thresholdSeconds;
}

/**
 * Format gas price in Gwei
 */
export function formatGwei(value: bigint): string {
  return formatUnits(value, 9);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format PnL with color indicator
 */
export function formatPnL(value: number): {
  formatted: string;
  color: 'positive' | 'negative' | 'neutral';
} {
  const formatted = value >= 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;
  const color = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  return { formatted, color };
}
