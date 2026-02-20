export const ORACLE_APIS = {
  PYTH_HERMES: 'https://hermes.pyth.network/v2/updates/price/latest',
  DIA_BASE: 'https://api.diadata.org/v1/rwa/Commodities',
  REDSTONE: 'https://api.redstone.finance/prices'
} as const;

export const PRICE_STALENESS_SECONDS = 600; // 10 minutes
export const RELAYER_INTERVAL_MS = parseInt(process.env.RELAYER_INTERVAL_MS || '60000');
