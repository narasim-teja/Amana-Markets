export interface PriceData {
  assetId: `0x${string}`;
  price: bigint;
  timestamp: number;
  source: string;
  decimals: number;
}

export interface TradeEvent {
  id: string; // tx hash + log index
  blockNumber: bigint;
  timestamp: number;
  trader: `0x${string}`;
  assetId: `0x${string}`;
  isBuy: boolean;
  stablecoinAmount: bigint;
  tokenAmount: bigint;
  oraclePrice: bigint;
  effectivePrice: bigint;
  spreadBps: bigint;
  fee: bigint;
  txHash: `0x${string}`;
}

export interface VaultEvent {
  type: 'deposit' | 'withdrawal' | 'exposure';
  blockNumber: bigint;
  timestamp: number;
  lp?: `0x${string}`;
  amount?: bigint;
  shares?: bigint;
  assetId?: `0x${string}`;
  assetExposure?: bigint;
  totalExposure?: bigint;
  txHash: `0x${string}`;
}

export interface UserEvent {
  address: `0x${string}`;
  action: 'whitelisted' | 'blacklisted' | 'removed';
  timestamp: number;
  blockNumber: bigint;
  txHash: `0x${string}`;
}
