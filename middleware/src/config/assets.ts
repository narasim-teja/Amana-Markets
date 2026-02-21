import { keccak256, toHex } from 'viem';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssetCategory = 'commodity' | 'stock' | 'etf' | 'fx';
export type AssetSource = 'pyth' | 'dia' | 'redstone' | 'yahoo' | 'csv';

export interface Asset {
  id: `0x${string}`;
  symbol: string;
  name: string;
  tokenSymbol: string;
  category: AssetCategory;
  decimals: number;
  sources: AssetSource[];
  // Source-specific config
  pythFeedId?: string;
  diaCategory?: string;   // 'Commodities' | 'Equities' | 'ETF' | 'Fiat'
  diaTicker?: string;      // e.g. 'XAU-USD', 'AAPL', 'IVV', 'EUR-USD'
  redstoneSymbol?: string;
  yahooSymbol?: string;
  yahooCurrencyDivisor?: number; // 100 for USX→USD
  csvFile?: string;              // CSV filename in historical-data/ (ADX stocks)
  tokenAddress?: `0x${string}`;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function assetId(symbol: string): `0x${string}` {
  return keccak256(toHex(`${symbol}/USD`));
}

// ─── Asset ID Constants ──────────────────────────────────────────────────────

export const ASSET_IDS = {
  // Pyth Commodities
  GOLD: assetId('XAU'),
  SILVER: assetId('XAG'),
  PLATINUM: assetId('XPT'),
  PALLADIUM: assetId('XPD'),
  OIL: assetId('WTI'),
  BRENT: assetId('BRT'),
  // RedStone Commodities
  COPPER: assetId('XCU'),
  NATGAS: assetId('NG'),
  CORN: assetId('CORN'),
  SOYBEAN: assetId('SOYBEAN'),
  URANIUM: assetId('URANIUM'),
  // Yahoo Commodities
  WHEAT: assetId('WHEAT'),
  COFFEE: assetId('COFFEE'),
  SUGAR: assetId('SUGAR'),
  COTTON: assetId('COTTON'),
  COCOA: assetId('COCOA'),
  ALUMINUM: assetId('ALU'),
  LUMBER: assetId('LUMBER'),
  IRON: assetId('IRON'),
  HEATING_OIL: assetId('HEAT'),
  // DIA ETFs
  TLT: assetId('TLT'),
  SHY: assetId('SHY'),
  VGSH: assetId('VGSH'),
  GOVT: assetId('GOVT'),
  BETH: assetId('BETH'),
  ETHA: assetId('ETHA'),
  BITO: assetId('BITO'),
  GBTC: assetId('GBTC'),
  HODL: assetId('HODL'),
  ARKB: assetId('ARKB'),
  FBTC: assetId('FBTC'),
  IBIT: assetId('IBIT'),
  QQQ: assetId('QQQ'),
  SPY: assetId('SPY'),
  IVV: assetId('IVV'),
  // DIA Equities
  AAPL: assetId('AAPL'),
  MSFT: assetId('MSFT'),
  GOOGL: assetId('GOOGL'),
  AMZN: assetId('AMZN'),
  NVDA: assetId('NVDA'),
  META: assetId('META'),
  TSLA: assetId('TSLA'),
  JPM: assetId('JPM'),
  V: assetId('V'),
  JNJ: assetId('JNJ'),
  WMT: assetId('WMT'),
  PG: assetId('PG'),
  MA: assetId('MA'),
  UNH: assetId('UNH'),
  HD: assetId('HD'),
  DIS: assetId('DIS'),
  BAC: assetId('BAC'),
  ADBE: assetId('ADBE'),
  CRM: assetId('CRM'),
  NFLX: assetId('NFLX'),
  AMD: assetId('AMD'),
  INTC: assetId('INTC'),
  CSCO: assetId('CSCO'),
  PEP: assetId('PEP'),
  KO: assetId('KO'),
  COST: assetId('COST'),
  TMO: assetId('TMO'),
  ABT: assetId('ABT'),
  AVGO: assetId('AVGO'),
  MRK: assetId('MRK'),
  LLY: assetId('LLY'),
  PFE: assetId('PFE'),
  TXN: assetId('TXN'),
  QCOM: assetId('QCOM'),
  ORCL: assetId('ORCL'),
  MS: assetId('MS'),
  GS: assetId('GS'),
  AXP: assetId('AXP'),
  IBM: assetId('IBM'),
  GE: assetId('GE'),
  CAT: assetId('CAT'),
  BA: assetId('BA'),
  HON: assetId('HON'),
  UPS: assetId('UPS'),
  RTX: assetId('RTX'),
  NEE: assetId('NEE'),
  AMAT: assetId('AMAT'),
  LOW: assetId('LOW'),
  SBUX: assetId('SBUX'),
  MDT: assetId('MDT'),
  CVX: assetId('CVX'),
  XOM: assetId('XOM'),
  COP: assetId('COP'),
  SLB: assetId('SLB'),
  T: assetId('T'),
  VZ: assetId('VZ'),
  CMCSA: assetId('CMCSA'),
  PYPL: assetId('PYPL'),
  ABNB: assetId('ABNB'),
  UBER: assetId('UBER'),
  SQ: assetId('SQ'),
  COIN: assetId('COIN'),
  // CSV ADX Equities (Abu Dhabi Securities Exchange)
  FAB: assetId('FAB'),
  ALDAR: assetId('ALDAR'),
  ADIB: assetId('ADIB'),
  ALPHADHABI: assetId('ALPHADHABI'),
  IHC: assetId('IHC'),
  EIC: assetId('EIC'),
  TPZERO: assetId('TPZERO'),
  UNIONINS: assetId('UNIONINS'),
  ESHRAQ: assetId('ESHRAQ'),
  SUDATEL: assetId('SUDATEL'),
  // DIA Fiat/FX
  EUR: assetId('EUR'),
  GBP: assetId('GBP'),
  JPY: assetId('JPY'),
  AUD: assetId('AUD'),
  CAD: assetId('CAD'),
  CHF: assetId('CHF'),
  CNY: assetId('CNY'),
  NZD: assetId('NZD'),
  SEK: assetId('SEK'),
  NOK: assetId('NOK'),
  SGD: assetId('SGD'),
  HKD: assetId('HKD'),
  KRW: assetId('KRW'),
} as const;

// ─── Full Asset Registry ─────────────────────────────────────────────────────

export const ASSETS: Asset[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PYTH COMMODITIES (6) — Primary: Pyth, Secondary: DIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.GOLD, symbol: 'XAU', name: 'Gold', tokenSymbol: 'xGOLD',
    category: 'commodity', decimals: 18,
    sources: ['pyth', 'dia'],
    pythFeedId: '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
    diaCategory: 'Commodities', diaTicker: 'XAU-USD',
    tokenAddress: process.env.XGOLD as `0x${string}`,
  },
  {
    id: ASSET_IDS.SILVER, symbol: 'XAG', name: 'Silver', tokenSymbol: 'xSILVER',
    category: 'commodity', decimals: 18,
    sources: ['pyth', 'dia'],
    pythFeedId: '0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e',
    diaCategory: 'Commodities', diaTicker: 'XAG-USD',
    tokenAddress: process.env.XSILVER as `0x${string}`,
  },
  {
    id: ASSET_IDS.PLATINUM, symbol: 'XPT', name: 'Platinum', tokenSymbol: 'xPLATINUM',
    category: 'commodity', decimals: 18,
    sources: ['pyth'],
    pythFeedId: '0x398e4bbc7cbf89d6648c21e08019d878967677753b3096799595c78f805a34e5',
  },
  {
    id: ASSET_IDS.PALLADIUM, symbol: 'XPD', name: 'Palladium', tokenSymbol: 'xPALLADIUM',
    category: 'commodity', decimals: 18,
    sources: ['pyth'],
    pythFeedId: '0x80367e9664197f37d89a07a804dffd2101c479c7c4e8490501bc9d9e1e7f9021',
  },
  {
    id: ASSET_IDS.OIL, symbol: 'WTI', name: 'Crude Oil (WTI)', tokenSymbol: 'xOIL',
    category: 'commodity', decimals: 18,
    sources: ['pyth', 'dia'],
    pythFeedId: '0x925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6',
    diaCategory: 'Commodities', diaTicker: 'WTI-USD',
    tokenAddress: process.env.XOIL as `0x${string}`,
  },
  {
    id: ASSET_IDS.BRENT, symbol: 'BRT', name: 'Brent Crude Oil', tokenSymbol: 'xBRENT',
    category: 'commodity', decimals: 18,
    sources: ['pyth', 'dia'],
    pythFeedId: '0x27f0d5e09a830083e5491795cac9ca521399c8f7fd56240d09484b14e614d57a',
    diaCategory: 'Commodities', diaTicker: 'XBR-USD',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REDSTONE COMMODITIES (5) — Primary: RedStone, some with DIA secondary
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.COPPER, symbol: 'XCU', name: 'Copper', tokenSymbol: 'xCOPPER',
    category: 'commodity', decimals: 18,
    sources: ['redstone'],
    redstoneSymbol: 'XCU',
  },
  {
    id: ASSET_IDS.NATGAS, symbol: 'NG', name: 'Natural Gas', tokenSymbol: 'xNATGAS',
    category: 'commodity', decimals: 18,
    sources: ['redstone', 'dia'],
    redstoneSymbol: 'NG',
    diaCategory: 'Commodities', diaTicker: 'NG-USD',
  },
  {
    id: ASSET_IDS.CORN, symbol: 'CORN', name: 'Corn', tokenSymbol: 'xCORN',
    category: 'commodity', decimals: 18,
    sources: ['redstone'],
    redstoneSymbol: 'CORN',
    yahooSymbol: 'ZC=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.SOYBEAN, symbol: 'SOYBEAN', name: 'Soybeans', tokenSymbol: 'xSOYBEAN',
    category: 'commodity', decimals: 18,
    sources: ['redstone'],
    redstoneSymbol: 'SOYBEAN',
    yahooSymbol: 'ZS=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.URANIUM, symbol: 'URANIUM', name: 'Uranium', tokenSymbol: 'xURANIUM',
    category: 'commodity', decimals: 18,
    sources: ['redstone'],
    redstoneSymbol: 'URANIUM',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // YAHOO FINANCE COMMODITIES (9) — Primary: Yahoo
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.WHEAT, symbol: 'WHEAT', name: 'Wheat', tokenSymbol: 'xWHEAT',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'ZW=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.COFFEE, symbol: 'COFFEE', name: 'Coffee', tokenSymbol: 'xCOFFEE',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'KC=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.SUGAR, symbol: 'SUGAR', name: 'Sugar', tokenSymbol: 'xSUGAR',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'SB=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.COTTON, symbol: 'COTTON', name: 'Cotton', tokenSymbol: 'xCOTTON',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'CT=F', yahooCurrencyDivisor: 100,
  },
  {
    id: ASSET_IDS.COCOA, symbol: 'COCOA', name: 'Cocoa', tokenSymbol: 'xCOCOA',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'CC=F',
  },
  {
    id: ASSET_IDS.ALUMINUM, symbol: 'ALU', name: 'Aluminum', tokenSymbol: 'xALUMINUM',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'ALI=F',
  },
  {
    id: ASSET_IDS.LUMBER, symbol: 'LUMBER', name: 'Lumber', tokenSymbol: 'xLUMBER',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'LBR=F',
  },
  {
    id: ASSET_IDS.IRON, symbol: 'IRON', name: 'Iron Ore', tokenSymbol: 'xIRON',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'TIO=F',
  },
  {
    id: ASSET_IDS.HEATING_OIL, symbol: 'HEAT', name: 'Heating Oil', tokenSymbol: 'xHEATOIL',
    category: 'commodity', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'HO=F',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIA ETFs (15) — Primary: DIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.TLT, symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', tokenSymbol: 'xTLT',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'TLT',
  },
  {
    id: ASSET_IDS.SHY, symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', tokenSymbol: 'xSHY',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'SHY',
  },
  {
    id: ASSET_IDS.VGSH, symbol: 'VGSH', name: 'Vanguard Short-Term Treasury ETF', tokenSymbol: 'xVGSH',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'VGSH',
    yahooSymbol: 'VGSH',
  },
  {
    id: ASSET_IDS.GOVT, symbol: 'GOVT', name: 'iShares U.S. Treasury Bond ETF', tokenSymbol: 'xGOVT',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'GOVT',
    yahooSymbol: 'GOVT',
  },
  {
    id: ASSET_IDS.BETH, symbol: 'BETH', name: 'ProShares Bitcoin & Ether ETF', tokenSymbol: 'xBETH',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'BETH',
    yahooSymbol: 'BETH',
  },
  {
    id: ASSET_IDS.ETHA, symbol: 'ETHA', name: 'iShares Ethereum Trust ETF', tokenSymbol: 'xETHA',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'ETHA',
    yahooSymbol: 'ETHA',
  },
  {
    id: ASSET_IDS.BITO, symbol: 'BITO', name: 'ProShares Bitcoin Strategy ETF', tokenSymbol: 'xBITO',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'BITO',
  },
  {
    id: ASSET_IDS.GBTC, symbol: 'GBTC', name: 'Grayscale Bitcoin Trust', tokenSymbol: 'xGBTC',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'GBTC',
  },
  {
    id: ASSET_IDS.HODL, symbol: 'HODL', name: 'VanEck Bitcoin ETF', tokenSymbol: 'xHODL',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'HODL',
    yahooSymbol: 'HODL',
  },
  {
    id: ASSET_IDS.ARKB, symbol: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', tokenSymbol: 'xARKB',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'ARKB',
    yahooSymbol: 'ARKB',
  },
  {
    id: ASSET_IDS.FBTC, symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', tokenSymbol: 'xFBTC',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'FBTC',
    yahooSymbol: 'FBTC',
  },
  {
    id: ASSET_IDS.IBIT, symbol: 'IBIT', name: 'iShares Bitcoin Trust', tokenSymbol: 'xIBIT',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'IBIT',
  },
  {
    id: ASSET_IDS.QQQ, symbol: 'QQQ', name: 'Invesco QQQ Trust', tokenSymbol: 'xQQQ',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'QQQ',
  },
  {
    id: ASSET_IDS.SPY, symbol: 'SPY', name: 'SPDR S&P 500 ETF', tokenSymbol: 'xSPY',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'SPY',
  },
  {
    id: ASSET_IDS.IVV, symbol: 'IVV', name: 'iShares Core S&P 500 ETF', tokenSymbol: 'xIVV',
    category: 'etf', decimals: 18,
    sources: ['dia'], diaCategory: 'ETF', diaTicker: 'IVV',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIA EQUITIES (60) — Primary: DIA
  // ═══════════════════════════════════════════════════════════════════════════
  // --- Mega Cap Tech ---
  {
    id: ASSET_IDS.AAPL, symbol: 'AAPL', name: 'Apple', tokenSymbol: 'xAAPL',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AAPL',
  },
  {
    id: ASSET_IDS.MSFT, symbol: 'MSFT', name: 'Microsoft', tokenSymbol: 'xMSFT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'MSFT',
  },
  {
    id: ASSET_IDS.GOOGL, symbol: 'GOOGL', name: 'Alphabet (Google)', tokenSymbol: 'xGOOGL',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'GOOGL',
  },
  {
    id: ASSET_IDS.AMZN, symbol: 'AMZN', name: 'Amazon', tokenSymbol: 'xAMZN',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AMZN',
  },
  {
    id: ASSET_IDS.NVDA, symbol: 'NVDA', name: 'NVIDIA', tokenSymbol: 'xNVDA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'NVDA',
  },
  {
    id: ASSET_IDS.META, symbol: 'META', name: 'Meta Platforms', tokenSymbol: 'xMETA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'META',
  },
  {
    id: ASSET_IDS.TSLA, symbol: 'TSLA', name: 'Tesla', tokenSymbol: 'xTSLA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'TSLA',
  },
  // --- Finance ---
  {
    id: ASSET_IDS.JPM, symbol: 'JPM', name: 'JPMorgan Chase', tokenSymbol: 'xJPM',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'JPM',
  },
  {
    id: ASSET_IDS.V, symbol: 'V', name: 'Visa', tokenSymbol: 'xV',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'V',
  },
  {
    id: ASSET_IDS.MA, symbol: 'MA', name: 'Mastercard', tokenSymbol: 'xMA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'MA',
  },
  {
    id: ASSET_IDS.BAC, symbol: 'BAC', name: 'Bank of America', tokenSymbol: 'xBAC',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'BAC',
  },
  {
    id: ASSET_IDS.MS, symbol: 'MS', name: 'Morgan Stanley', tokenSymbol: 'xMS',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'MS',
  },
  {
    id: ASSET_IDS.GS, symbol: 'GS', name: 'Goldman Sachs', tokenSymbol: 'xGS',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'GS',
  },
  {
    id: ASSET_IDS.AXP, symbol: 'AXP', name: 'American Express', tokenSymbol: 'xAXP',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AXP',
  },
  {
    id: ASSET_IDS.PYPL, symbol: 'PYPL', name: 'PayPal', tokenSymbol: 'xPYPL',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'PYPL',
  },
  {
    id: ASSET_IDS.COIN, symbol: 'COIN', name: 'Coinbase', tokenSymbol: 'xCOIN',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'COIN',
  },
  {
    id: ASSET_IDS.SQ, symbol: 'SQ', name: 'Block (Square)', tokenSymbol: 'xSQ',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'SQ',
  },
  // --- Healthcare ---
  {
    id: ASSET_IDS.JNJ, symbol: 'JNJ', name: 'Johnson & Johnson', tokenSymbol: 'xJNJ',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'JNJ',
  },
  {
    id: ASSET_IDS.UNH, symbol: 'UNH', name: 'UnitedHealth Group', tokenSymbol: 'xUNH',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'UNH',
  },
  {
    id: ASSET_IDS.LLY, symbol: 'LLY', name: 'Eli Lilly', tokenSymbol: 'xLLY',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'LLY',
  },
  {
    id: ASSET_IDS.MRK, symbol: 'MRK', name: 'Merck', tokenSymbol: 'xMRK',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'MRK',
  },
  {
    id: ASSET_IDS.PFE, symbol: 'PFE', name: 'Pfizer', tokenSymbol: 'xPFE',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'PFE',
  },
  {
    id: ASSET_IDS.ABT, symbol: 'ABT', name: 'Abbott Laboratories', tokenSymbol: 'xABT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'ABT',
  },
  {
    id: ASSET_IDS.TMO, symbol: 'TMO', name: 'Thermo Fisher Scientific', tokenSymbol: 'xTMO',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'TMO',
  },
  {
    id: ASSET_IDS.MDT, symbol: 'MDT', name: 'Medtronic', tokenSymbol: 'xMDT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'MDT',
  },
  // --- Consumer ---
  {
    id: ASSET_IDS.WMT, symbol: 'WMT', name: 'Walmart', tokenSymbol: 'xWMT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'WMT',
  },
  {
    id: ASSET_IDS.PG, symbol: 'PG', name: 'Procter & Gamble', tokenSymbol: 'xPG',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'PG',
  },
  {
    id: ASSET_IDS.KO, symbol: 'KO', name: 'Coca-Cola', tokenSymbol: 'xKO',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'KO',
  },
  {
    id: ASSET_IDS.PEP, symbol: 'PEP', name: 'PepsiCo', tokenSymbol: 'xPEP',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'PEP',
  },
  {
    id: ASSET_IDS.COST, symbol: 'COST', name: 'Costco', tokenSymbol: 'xCOST',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'COST',
  },
  {
    id: ASSET_IDS.HD, symbol: 'HD', name: 'Home Depot', tokenSymbol: 'xHD',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'HD',
  },
  {
    id: ASSET_IDS.LOW, symbol: 'LOW', name: "Lowe's", tokenSymbol: 'xLOW',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'LOW',
  },
  {
    id: ASSET_IDS.DIS, symbol: 'DIS', name: 'Walt Disney', tokenSymbol: 'xDIS',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'DIS',
  },
  {
    id: ASSET_IDS.NFLX, symbol: 'NFLX', name: 'Netflix', tokenSymbol: 'xNFLX',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'NFLX',
  },
  {
    id: ASSET_IDS.SBUX, symbol: 'SBUX', name: 'Starbucks', tokenSymbol: 'xSBUX',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'SBUX',
  },
  {
    id: ASSET_IDS.ABNB, symbol: 'ABNB', name: 'Airbnb', tokenSymbol: 'xABNB',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'ABNB',
  },
  {
    id: ASSET_IDS.UBER, symbol: 'UBER', name: 'Uber', tokenSymbol: 'xUBER',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'UBER',
  },
  // --- Semiconductors & Tech ---
  {
    id: ASSET_IDS.AVGO, symbol: 'AVGO', name: 'Broadcom', tokenSymbol: 'xAVGO',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AVGO',
  },
  {
    id: ASSET_IDS.AMD, symbol: 'AMD', name: 'AMD', tokenSymbol: 'xAMD',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AMD',
  },
  {
    id: ASSET_IDS.INTC, symbol: 'INTC', name: 'Intel', tokenSymbol: 'xINTC',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'INTC',
  },
  {
    id: ASSET_IDS.TXN, symbol: 'TXN', name: 'Texas Instruments', tokenSymbol: 'xTXN',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'TXN',
  },
  {
    id: ASSET_IDS.QCOM, symbol: 'QCOM', name: 'Qualcomm', tokenSymbol: 'xQCOM',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'QCOM',
  },
  {
    id: ASSET_IDS.AMAT, symbol: 'AMAT', name: 'Applied Materials', tokenSymbol: 'xAMAT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'AMAT',
  },
  {
    id: ASSET_IDS.CSCO, symbol: 'CSCO', name: 'Cisco', tokenSymbol: 'xCSCO',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'CSCO',
  },
  {
    id: ASSET_IDS.ADBE, symbol: 'ADBE', name: 'Adobe', tokenSymbol: 'xADBE',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'ADBE',
  },
  {
    id: ASSET_IDS.CRM, symbol: 'CRM', name: 'Salesforce', tokenSymbol: 'xCRM',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'CRM',
  },
  {
    id: ASSET_IDS.ORCL, symbol: 'ORCL', name: 'Oracle', tokenSymbol: 'xORCL',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'ORCL',
  },
  {
    id: ASSET_IDS.IBM, symbol: 'IBM', name: 'IBM', tokenSymbol: 'xIBM',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'IBM',
  },
  // --- Industrial ---
  {
    id: ASSET_IDS.GE, symbol: 'GE', name: 'GE Aerospace', tokenSymbol: 'xGE',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'GE',
  },
  {
    id: ASSET_IDS.CAT, symbol: 'CAT', name: 'Caterpillar', tokenSymbol: 'xCAT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'CAT',
  },
  {
    id: ASSET_IDS.BA, symbol: 'BA', name: 'Boeing', tokenSymbol: 'xBA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'BA',
  },
  {
    id: ASSET_IDS.HON, symbol: 'HON', name: 'Honeywell', tokenSymbol: 'xHON',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'HON',
  },
  {
    id: ASSET_IDS.UPS, symbol: 'UPS', name: 'United Parcel Service', tokenSymbol: 'xUPS',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'UPS',
  },
  {
    id: ASSET_IDS.RTX, symbol: 'RTX', name: 'RTX (Raytheon)', tokenSymbol: 'xRTX',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'RTX',
  },
  // --- Energy ---
  {
    id: ASSET_IDS.XOM, symbol: 'XOM', name: 'ExxonMobil', tokenSymbol: 'xXOM',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'XOM',
  },
  {
    id: ASSET_IDS.CVX, symbol: 'CVX', name: 'Chevron', tokenSymbol: 'xCVX',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'CVX',
  },
  {
    id: ASSET_IDS.COP, symbol: 'COP', name: 'ConocoPhillips', tokenSymbol: 'xCOP',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'COP',
  },
  {
    id: ASSET_IDS.SLB, symbol: 'SLB', name: 'Schlumberger', tokenSymbol: 'xSLB',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'SLB',
  },
  {
    id: ASSET_IDS.NEE, symbol: 'NEE', name: 'NextEra Energy', tokenSymbol: 'xNEE',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'NEE',
  },
  // --- Telecom ---
  {
    id: ASSET_IDS.T, symbol: 'T', name: 'AT&T', tokenSymbol: 'xT',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'T',
  },
  {
    id: ASSET_IDS.VZ, symbol: 'VZ', name: 'Verizon', tokenSymbol: 'xVZ',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'VZ',
  },
  {
    id: ASSET_IDS.CMCSA, symbol: 'CMCSA', name: 'Comcast', tokenSymbol: 'xCMCSA',
    category: 'stock', decimals: 18,
    sources: ['dia'], diaCategory: 'Equities', diaTicker: 'CMCSA',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CSV ADX EQUITIES (10) — Abu Dhabi Securities Exchange (historical CSV data)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.FAB, symbol: 'FAB', name: 'First Abu Dhabi Bank', tokenSymbol: 'xFAB',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'First Abu Dhabi Bank Stock Price History.csv',
  },
  {
    id: ASSET_IDS.ALDAR, symbol: 'ALDAR', name: 'Aldar Properties', tokenSymbol: 'xALDAR',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Aldar Properties Stock Price History.csv',
  },
  {
    id: ASSET_IDS.ADIB, symbol: 'ADIB', name: 'Abu Dhabi Islamic Bank', tokenSymbol: 'xADIB',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Abu Dhabi Islamic Bank PJSC Stock Price History.csv',
  },
  {
    id: ASSET_IDS.ALPHADHABI, symbol: 'ALPHADHABI', name: 'Alpha Dhabi Holding', tokenSymbol: 'xALPHADHABI',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Alpha Dhabi Holding PJSC Stock Price History.csv',
  },
  {
    id: ASSET_IDS.IHC, symbol: 'IHC', name: 'International Holding Company', tokenSymbol: 'xIHC',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'International Holding Company Stock Price History.csv',
  },
  {
    id: ASSET_IDS.EIC, symbol: 'EIC', name: 'Emirates Insurance Company', tokenSymbol: 'xEIC',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Emirates Ins C Stock Price History.csv',
  },
  {
    id: ASSET_IDS.TPZERO, symbol: 'TPZERO', name: 'Two Point Zero', tokenSymbol: 'xTPZERO',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Two Point Zero PJSC Stock Price History.csv',
  },
  {
    id: ASSET_IDS.UNIONINS, symbol: 'UNIONINS', name: 'Union Insurance', tokenSymbol: 'xUNIONINS',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Union Insurance Stock Price History.csv',
  },
  {
    id: ASSET_IDS.ESHRAQ, symbol: 'ESHRAQ', name: 'Eshraq Investments', tokenSymbol: 'xESHRAQ',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Eshraq Investments PJSC Stock Price History.csv',
  },
  {
    id: ASSET_IDS.SUDATEL, symbol: 'SUDATEL', name: 'Sudatel Telecom Group', tokenSymbol: 'xSUDATEL',
    category: 'stock', decimals: 18,
    sources: ['csv'], csvFile: 'Sudatel Telecom Group Stock Price History.csv',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIA FIAT / FX (13) — Primary: DIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: ASSET_IDS.EUR, symbol: 'EUR', name: 'Euro', tokenSymbol: 'xEUR',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'EUR-USD',
  },
  {
    id: ASSET_IDS.GBP, symbol: 'GBP', name: 'British Pound', tokenSymbol: 'xGBP',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'GBP-USD',
  },
  {
    id: ASSET_IDS.JPY, symbol: 'JPY', name: 'Japanese Yen', tokenSymbol: 'xJPY',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'JPY-USD',
  },
  {
    id: ASSET_IDS.AUD, symbol: 'AUD', name: 'Australian Dollar', tokenSymbol: 'xAUD',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'AUD-USD',
  },
  {
    id: ASSET_IDS.CAD, symbol: 'CAD', name: 'Canadian Dollar', tokenSymbol: 'xCAD',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'CAD-USD',
  },
  {
    id: ASSET_IDS.CHF, symbol: 'CHF', name: 'Swiss Franc', tokenSymbol: 'xCHF',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'CHF-USD',
  },
  {
    id: ASSET_IDS.CNY, symbol: 'CNY', name: 'Chinese Yuan', tokenSymbol: 'xCNY',
    category: 'fx', decimals: 18,
    sources: ['dia'], diaCategory: 'Fiat', diaTicker: 'CNY-USD',
  },
  {
    id: ASSET_IDS.NZD, symbol: 'NZD', name: 'New Zealand Dollar', tokenSymbol: 'xNZD',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'NZDUSD=X',
  },
  {
    id: ASSET_IDS.SEK, symbol: 'SEK', name: 'Swedish Krona', tokenSymbol: 'xSEK',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'SEKUSD=X',
  },
  {
    id: ASSET_IDS.NOK, symbol: 'NOK', name: 'Norwegian Krone', tokenSymbol: 'xNOK',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'NOKUSD=X',
  },
  {
    id: ASSET_IDS.SGD, symbol: 'SGD', name: 'Singapore Dollar', tokenSymbol: 'xSGD',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'SGDUSD=X',
  },
  {
    id: ASSET_IDS.HKD, symbol: 'HKD', name: 'Hong Kong Dollar', tokenSymbol: 'xHKD',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'HKDUSD=X',
  },
  {
    id: ASSET_IDS.KRW, symbol: 'KRW', name: 'South Korean Won', tokenSymbol: 'xKRW',
    category: 'fx', decimals: 18,
    sources: ['yahoo'],
    yahooSymbol: 'KRWUSD=X',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAssetById(id: string): Asset | undefined {
  return ASSETS.find(a => a.id === id);
}

export function getAssetBySymbol(symbol: string): Asset | undefined {
  return ASSETS.find(a => a.symbol === symbol);
}

export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return ASSETS.filter(a => a.category === category);
}

export function getAssetsBySource(source: AssetSource): Asset[] {
  return ASSETS.filter(a => a.sources.includes(source));
}
