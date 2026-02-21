export const ORACLE_APIS = {
  PYTH_HERMES: 'https://hermes.pyth.network/v2/updates/price/latest',
  DIA_RWA: 'https://api.diadata.org/v1/rwa',
  REDSTONE: 'https://api.redstone.finance/prices',
  YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart',
} as const;

export const RELAYER_INTERVAL_MS = parseInt(process.env.RELAYER_INTERVAL_MS || '3600000'); // 60 minutes
export const PRICE_STALENESS_SECONDS = 7200; // 2 hours (must exceed push interval)
