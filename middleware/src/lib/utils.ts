export function formatPrice(price: bigint, decimals: number = 8): string {
  return (Number(price) / 10 ** decimals).toFixed(decimals);
}

export function parsePrice(price: number, decimals: number = 8): bigint {
  return BigInt(Math.floor(price * 10 ** decimals));
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function isStale(timestamp: number, maxAgeSeconds: number): boolean {
  return getCurrentTimestamp() - timestamp > maxAgeSeconds;
}
