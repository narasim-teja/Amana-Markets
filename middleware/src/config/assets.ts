import { keccak256, toHex } from 'viem';

export const ASSET_IDS = {
  GOLD: keccak256(toHex('XAU/USD')),
  SILVER: keccak256(toHex('XAG/USD')),
  OIL: keccak256(toHex('WTI/USD'))
} as const;

export const ASSETS = [
  {
    id: ASSET_IDS.GOLD,
    symbol: 'XAU',
    name: 'Gold',
    tokenSymbol: 'xGOLD',
    decimals: 18,
    pythFeedId: '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
    diaSymbol: 'XAU-USD',
    redstoneSymbol: 'XAU',
    unitConversion: 1, // 1 troy ounce
    tokenAddress: process.env.XGOLD as `0x${string}`
  },
  {
    id: ASSET_IDS.SILVER,
    symbol: 'XAG',
    name: 'Silver',
    tokenSymbol: 'xSILVER',
    decimals: 18,
    pythFeedId: '0xf2fb02c0120e23c4c9d6bcb8c0031139c61d52f9c9410f9d56e9c8e2d18e5b9a',
    diaSymbol: 'XAGG-USD', // Note: double G
    redstoneSymbol: 'XAG',
    unitConversion: 31.1035, // DIA returns per gram, need per troy ounce
    tokenAddress: process.env.XSILVER as `0x${string}`
  },
  {
    id: ASSET_IDS.OIL,
    symbol: 'WTI',
    name: 'Crude Oil (WTI)',
    tokenSymbol: 'xOIL',
    decimals: 18,
    pythFeedId: '0xd8839e13e93db50cbc1b5b5b75774638ab56c2a0f97bcdb541e63f75f66a0cd8',
    diaSymbol: null, // DIA doesn't have oil
    redstoneSymbol: 'CRUDE_OIL',
    unitConversion: 1,
    tokenAddress: process.env.XOIL as `0x${string}`
  }
] as const;

export function getAssetById(id: `0x${string}`) {
  return ASSETS.find(a => a.id === id);
}

export function getAssetBySymbol(symbol: string) {
  return ASSETS.find(a => a.symbol === symbol);
}
