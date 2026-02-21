import { keccak256, toHex } from 'viem';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssetCategory = 'commodity' | 'stock' | 'adx_stock' | 'etf' | 'fx';

/**
 * API Asset Response
 * Raw asset data from the /assets API endpoint
 */
export interface ApiAsset {
  asset_id: string;
  symbol?: string;
  name?: string;
  token_address?: `0x${string}`;
  status?: string;
  spread?: number;
  spread_bps?: number;
  is_paused?: number;
  exposure?: string;
  max_exposure?: string;
  volume_24h?: string;
}

/**
 * Asset Metadata Interface
 * Combines on-chain data with UI-specific metadata (icons, colors, etc.)
 */
export interface AssetMetadata {
  assetId: string;
  symbol: string;
  name: string;
  tokenSymbol: string;
  icon: string;
  color: string;
  description: string;
  category: AssetCategory;
  decimals: number;
  tokenAddress?: `0x${string}`;
  status?: string;
  spread?: number;
  exposure?: string;
  maxExposure?: string;
  volume24h?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function assetId(symbol: string): string {
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
  MA: assetId('MA'),
  BAC: assetId('BAC'),
  MS: assetId('MS'),
  GS: assetId('GS'),
  AXP: assetId('AXP'),
  PYPL: assetId('PYPL'),
  COIN: assetId('COIN'),
  SQ: assetId('SQ'),
  JNJ: assetId('JNJ'),
  UNH: assetId('UNH'),
  LLY: assetId('LLY'),
  MRK: assetId('MRK'),
  PFE: assetId('PFE'),
  ABT: assetId('ABT'),
  TMO: assetId('TMO'),
  MDT: assetId('MDT'),
  WMT: assetId('WMT'),
  PG: assetId('PG'),
  KO: assetId('KO'),
  PEP: assetId('PEP'),
  COST: assetId('COST'),
  HD: assetId('HD'),
  LOW: assetId('LOW'),
  DIS: assetId('DIS'),
  NFLX: assetId('NFLX'),
  SBUX: assetId('SBUX'),
  ABNB: assetId('ABNB'),
  UBER: assetId('UBER'),
  AVGO: assetId('AVGO'),
  AMD: assetId('AMD'),
  INTC: assetId('INTC'),
  TXN: assetId('TXN'),
  QCOM: assetId('QCOM'),
  AMAT: assetId('AMAT'),
  CSCO: assetId('CSCO'),
  ADBE: assetId('ADBE'),
  CRM: assetId('CRM'),
  ORCL: assetId('ORCL'),
  IBM: assetId('IBM'),
  GE: assetId('GE'),
  CAT: assetId('CAT'),
  BA: assetId('BA'),
  HON: assetId('HON'),
  UPS: assetId('UPS'),
  RTX: assetId('RTX'),
  XOM: assetId('XOM'),
  CVX: assetId('CVX'),
  COP: assetId('COP'),
  SLB: assetId('SLB'),
  NEE: assetId('NEE'),
  T: assetId('T'),
  VZ: assetId('VZ'),
  CMCSA: assetId('CMCSA'),
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

// ─── Static Metadata ─────────────────────────────────────────────────────────

// Helper to build commodity metadata
function commodity(
  id: string, symbol: string, name: string, tokenSymbol: string,
  color: string, description: string,
): AssetMetadata {
  return { assetId: id, symbol, name, tokenSymbol, icon: '/commodities/default.svg', color, description, category: 'commodity', decimals: 18 };
}

function stock(
  id: string, symbol: string, name: string, tokenSymbol: string,
  color: string,
): AssetMetadata {
  return { assetId: id, symbol, name, tokenSymbol, icon: '/commodities/default.svg', color, description: `${name} Stock`, category: 'stock', decimals: 18 };
}

function etf(
  id: string, symbol: string, name: string, tokenSymbol: string,
  color: string,
): AssetMetadata {
  return { assetId: id, symbol, name, tokenSymbol, icon: '/commodities/default.svg', color, description: `${name}`, category: 'etf', decimals: 18 };
}

function fx(
  id: string, symbol: string, name: string, tokenSymbol: string,
  color: string,
): AssetMetadata {
  return { assetId: id, symbol, name, tokenSymbol, icon: '/commodities/default.svg', color, description: `${name}/USD`, category: 'fx', decimals: 18 };
}

function adxStock(
  id: string, symbol: string, name: string, tokenSymbol: string,
  color: string,
): AssetMetadata {
  return { assetId: id, symbol, name, tokenSymbol, icon: '/commodities/default.svg', color, description: `${name} (ADX)`, category: 'adx_stock', decimals: 18 };
}

export const ASSET_METADATA: Record<string, AssetMetadata> = {
  // ═══ Pyth Commodities ═══
  [ASSET_IDS.GOLD]:      commodity(ASSET_IDS.GOLD, 'XAU', 'Gold', 'xGOLD', '#C9A96E', 'Precious metal — Troy ounce'),
  [ASSET_IDS.SILVER]:    commodity(ASSET_IDS.SILVER, 'XAG', 'Silver', 'xSILVER', '#C0C0C0', 'Precious metal — Troy ounce'),
  [ASSET_IDS.PLATINUM]:  commodity(ASSET_IDS.PLATINUM, 'XPT', 'Platinum', 'xPLATINUM', '#E5E4E2', 'Precious metal — Troy ounce'),
  [ASSET_IDS.PALLADIUM]: commodity(ASSET_IDS.PALLADIUM, 'XPD', 'Palladium', 'xPALLADIUM', '#B0C4DE', 'Precious metal — Troy ounce'),
  [ASSET_IDS.OIL]:       commodity(ASSET_IDS.OIL, 'WTI', 'Crude Oil (WTI)', 'xOIL', '#1A1A1A', 'West Texas Intermediate — Barrel'),
  [ASSET_IDS.BRENT]:     commodity(ASSET_IDS.BRENT, 'BRT', 'Brent Crude Oil', 'xBRENT', '#2D2D2D', 'Brent Crude — Barrel'),

  // ═══ RedStone Commodities ═══
  [ASSET_IDS.COPPER]:  commodity(ASSET_IDS.COPPER, 'XCU', 'Copper', 'xCOPPER', '#B87333', 'Industrial metal — Pound'),
  [ASSET_IDS.NATGAS]:  commodity(ASSET_IDS.NATGAS, 'NG', 'Natural Gas', 'xNATGAS', '#4169E1', 'Energy — MMBtu'),
  [ASSET_IDS.CORN]:    commodity(ASSET_IDS.CORN, 'CORN', 'Corn', 'xCORN', '#FFD700', 'Agriculture — Bushel'),
  [ASSET_IDS.SOYBEAN]: commodity(ASSET_IDS.SOYBEAN, 'SOYBEAN', 'Soybeans', 'xSOYBEAN', '#8B7D3C', 'Agriculture — Bushel'),
  [ASSET_IDS.URANIUM]: commodity(ASSET_IDS.URANIUM, 'URANIUM', 'Uranium', 'xURANIUM', '#32CD32', 'Energy — Pound'),

  // ═══ Yahoo Commodities ═══
  [ASSET_IDS.WHEAT]:       commodity(ASSET_IDS.WHEAT, 'WHEAT', 'Wheat', 'xWHEAT', '#DEB887', 'Agriculture — Bushel'),
  [ASSET_IDS.COFFEE]:      commodity(ASSET_IDS.COFFEE, 'COFFEE', 'Coffee', 'xCOFFEE', '#6F4E37', 'Agriculture — Pound'),
  [ASSET_IDS.SUGAR]:       commodity(ASSET_IDS.SUGAR, 'SUGAR', 'Sugar', 'xSUGAR', '#FAFAFA', 'Agriculture — Pound'),
  [ASSET_IDS.COTTON]:      commodity(ASSET_IDS.COTTON, 'COTTON', 'Cotton', 'xCOTTON', '#F5F5DC', 'Agriculture — Pound'),
  [ASSET_IDS.COCOA]:       commodity(ASSET_IDS.COCOA, 'COCOA', 'Cocoa', 'xCOCOA', '#3B1E08', 'Agriculture — Metric ton'),
  [ASSET_IDS.ALUMINUM]:    commodity(ASSET_IDS.ALUMINUM, 'ALU', 'Aluminum', 'xALUMINUM', '#A8A9AD', 'Industrial metal — Pound'),
  [ASSET_IDS.LUMBER]:      commodity(ASSET_IDS.LUMBER, 'LUMBER', 'Lumber', 'xLUMBER', '#8B4513', 'Forestry — Board feet'),
  [ASSET_IDS.IRON]:        commodity(ASSET_IDS.IRON, 'IRON', 'Iron Ore', 'xIRON', '#434343', 'Industrial metal — Metric ton'),
  [ASSET_IDS.HEATING_OIL]: commodity(ASSET_IDS.HEATING_OIL, 'HEAT', 'Heating Oil', 'xHEATOIL', '#FF6347', 'Energy — Gallon'),

  // ═══ DIA ETFs ═══
  [ASSET_IDS.TLT]:  etf(ASSET_IDS.TLT, 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'xTLT', '#1E3A5F'),
  [ASSET_IDS.SHY]:  etf(ASSET_IDS.SHY, 'SHY', 'iShares 1-3 Year Treasury Bond ETF', 'xSHY', '#2E5A8F'),
  [ASSET_IDS.VGSH]: etf(ASSET_IDS.VGSH, 'VGSH', 'Vanguard Short-Term Treasury ETF', 'xVGSH', '#8B0000'),
  [ASSET_IDS.GOVT]: etf(ASSET_IDS.GOVT, 'GOVT', 'iShares U.S. Treasury Bond ETF', 'xGOVT', '#1B3F8B'),
  [ASSET_IDS.BETH]: etf(ASSET_IDS.BETH, 'BETH', 'ProShares Bitcoin & Ether ETF', 'xBETH', '#F7931A'),
  [ASSET_IDS.ETHA]: etf(ASSET_IDS.ETHA, 'ETHA', 'iShares Ethereum Trust ETF', 'xETHA', '#627EEA'),
  [ASSET_IDS.BITO]: etf(ASSET_IDS.BITO, 'BITO', 'ProShares Bitcoin Strategy ETF', 'xBITO', '#FF9900'),
  [ASSET_IDS.GBTC]: etf(ASSET_IDS.GBTC, 'GBTC', 'Grayscale Bitcoin Trust', 'xGBTC', '#6B6B6B'),
  [ASSET_IDS.HODL]: etf(ASSET_IDS.HODL, 'HODL', 'VanEck Bitcoin ETF', 'xHODL', '#0066CC'),
  [ASSET_IDS.ARKB]: etf(ASSET_IDS.ARKB, 'ARKB', 'ARK 21Shares Bitcoin ETF', 'xARKB', '#FF4500'),
  [ASSET_IDS.FBTC]: etf(ASSET_IDS.FBTC, 'FBTC', 'Fidelity Wise Origin Bitcoin Fund', 'xFBTC', '#4CAF50'),
  [ASSET_IDS.IBIT]: etf(ASSET_IDS.IBIT, 'IBIT', 'iShares Bitcoin Trust', 'xIBIT', '#000000'),
  [ASSET_IDS.QQQ]:  etf(ASSET_IDS.QQQ, 'QQQ', 'Invesco QQQ Trust', 'xQQQ', '#0078D4'),
  [ASSET_IDS.SPY]:  etf(ASSET_IDS.SPY, 'SPY', 'SPDR S&P 500 ETF', 'xSPY', '#006400'),
  [ASSET_IDS.IVV]:  etf(ASSET_IDS.IVV, 'IVV', 'iShares Core S&P 500 ETF', 'xIVV', '#003366'),

  // ═══ DIA Equities — Mega Cap Tech ═══
  [ASSET_IDS.AAPL]:  stock(ASSET_IDS.AAPL, 'AAPL', 'Apple', 'xAAPL', '#555555'),
  [ASSET_IDS.MSFT]:  stock(ASSET_IDS.MSFT, 'MSFT', 'Microsoft', 'xMSFT', '#00A4EF'),
  [ASSET_IDS.GOOGL]: stock(ASSET_IDS.GOOGL, 'GOOGL', 'Alphabet (Google)', 'xGOOGL', '#4285F4'),
  [ASSET_IDS.AMZN]:  stock(ASSET_IDS.AMZN, 'AMZN', 'Amazon', 'xAMZN', '#FF9900'),
  [ASSET_IDS.NVDA]:  stock(ASSET_IDS.NVDA, 'NVDA', 'NVIDIA', 'xNVDA', '#76B900'),
  [ASSET_IDS.META]:  stock(ASSET_IDS.META, 'META', 'Meta Platforms', 'xMETA', '#0668E1'),
  [ASSET_IDS.TSLA]:  stock(ASSET_IDS.TSLA, 'TSLA', 'Tesla', 'xTSLA', '#CC0000'),

  // ═══ DIA Equities — Finance ═══
  [ASSET_IDS.JPM]:  stock(ASSET_IDS.JPM, 'JPM', 'JPMorgan Chase', 'xJPM', '#003A70'),
  [ASSET_IDS.V]:    stock(ASSET_IDS.V, 'V', 'Visa', 'xV', '#1A1F71'),
  [ASSET_IDS.MA]:   stock(ASSET_IDS.MA, 'MA', 'Mastercard', 'xMA', '#EB001B'),
  [ASSET_IDS.BAC]:  stock(ASSET_IDS.BAC, 'BAC', 'Bank of America', 'xBAC', '#012169'),
  [ASSET_IDS.MS]:   stock(ASSET_IDS.MS, 'MS', 'Morgan Stanley', 'xMS', '#002D72'),
  [ASSET_IDS.GS]:   stock(ASSET_IDS.GS, 'GS', 'Goldman Sachs', 'xGS', '#6C9BD1'),
  [ASSET_IDS.AXP]:  stock(ASSET_IDS.AXP, 'AXP', 'American Express', 'xAXP', '#006FCF'),
  [ASSET_IDS.PYPL]: stock(ASSET_IDS.PYPL, 'PYPL', 'PayPal', 'xPYPL', '#003087'),
  [ASSET_IDS.COIN]: stock(ASSET_IDS.COIN, 'COIN', 'Coinbase', 'xCOIN', '#0052FF'),
  [ASSET_IDS.SQ]:   stock(ASSET_IDS.SQ, 'SQ', 'Block (Square)', 'xSQ', '#3E4348'),

  // ═══ DIA Equities — Healthcare ═══
  [ASSET_IDS.JNJ]: stock(ASSET_IDS.JNJ, 'JNJ', 'Johnson & Johnson', 'xJNJ', '#D51900'),
  [ASSET_IDS.UNH]: stock(ASSET_IDS.UNH, 'UNH', 'UnitedHealth Group', 'xUNH', '#004C91'),
  [ASSET_IDS.LLY]: stock(ASSET_IDS.LLY, 'LLY', 'Eli Lilly', 'xLLY', '#D52B1E'),
  [ASSET_IDS.MRK]: stock(ASSET_IDS.MRK, 'MRK', 'Merck', 'xMRK', '#009A44'),
  [ASSET_IDS.PFE]: stock(ASSET_IDS.PFE, 'PFE', 'Pfizer', 'xPFE', '#0093D0'),
  [ASSET_IDS.ABT]: stock(ASSET_IDS.ABT, 'ABT', 'Abbott Laboratories', 'xABT', '#1D71B8'),
  [ASSET_IDS.TMO]: stock(ASSET_IDS.TMO, 'TMO', 'Thermo Fisher Scientific', 'xTMO', '#E31937'),
  [ASSET_IDS.MDT]: stock(ASSET_IDS.MDT, 'MDT', 'Medtronic', 'xMDT', '#004B87'),

  // ═══ DIA Equities — Consumer ═══
  [ASSET_IDS.WMT]:  stock(ASSET_IDS.WMT, 'WMT', 'Walmart', 'xWMT', '#0071CE'),
  [ASSET_IDS.PG]:   stock(ASSET_IDS.PG, 'PG', 'Procter & Gamble', 'xPG', '#003DA5'),
  [ASSET_IDS.KO]:   stock(ASSET_IDS.KO, 'KO', 'Coca-Cola', 'xKO', '#F40009'),
  [ASSET_IDS.PEP]:  stock(ASSET_IDS.PEP, 'PEP', 'PepsiCo', 'xPEP', '#004B93'),
  [ASSET_IDS.COST]: stock(ASSET_IDS.COST, 'COST', 'Costco', 'xCOST', '#E31837'),
  [ASSET_IDS.HD]:   stock(ASSET_IDS.HD, 'HD', 'Home Depot', 'xHD', '#F96302'),
  [ASSET_IDS.LOW]:  stock(ASSET_IDS.LOW, 'LOW', "Lowe's", 'xLOW', '#004990'),
  [ASSET_IDS.DIS]:  stock(ASSET_IDS.DIS, 'DIS', 'Walt Disney', 'xDIS', '#006E99'),
  [ASSET_IDS.NFLX]: stock(ASSET_IDS.NFLX, 'NFLX', 'Netflix', 'xNFLX', '#E50914'),
  [ASSET_IDS.SBUX]: stock(ASSET_IDS.SBUX, 'SBUX', 'Starbucks', 'xSBUX', '#00704A'),
  [ASSET_IDS.ABNB]: stock(ASSET_IDS.ABNB, 'ABNB', 'Airbnb', 'xABNB', '#FF5A5F'),
  [ASSET_IDS.UBER]: stock(ASSET_IDS.UBER, 'UBER', 'Uber', 'xUBER', '#000000'),

  // ═══ DIA Equities — Semiconductors & Tech ═══
  [ASSET_IDS.AVGO]: stock(ASSET_IDS.AVGO, 'AVGO', 'Broadcom', 'xAVGO', '#CC0000'),
  [ASSET_IDS.AMD]:  stock(ASSET_IDS.AMD, 'AMD', 'AMD', 'xAMD', '#ED1C24'),
  [ASSET_IDS.INTC]: stock(ASSET_IDS.INTC, 'INTC', 'Intel', 'xINTC', '#0071C5'),
  [ASSET_IDS.TXN]:  stock(ASSET_IDS.TXN, 'TXN', 'Texas Instruments', 'xTXN', '#CC0000'),
  [ASSET_IDS.QCOM]: stock(ASSET_IDS.QCOM, 'QCOM', 'Qualcomm', 'xQCOM', '#3253DC'),
  [ASSET_IDS.AMAT]: stock(ASSET_IDS.AMAT, 'AMAT', 'Applied Materials', 'xAMAT', '#ED6B21'),
  [ASSET_IDS.CSCO]: stock(ASSET_IDS.CSCO, 'CSCO', 'Cisco', 'xCSCO', '#1BA0D7'),
  [ASSET_IDS.ADBE]: stock(ASSET_IDS.ADBE, 'ADBE', 'Adobe', 'xADBE', '#FF0000'),
  [ASSET_IDS.CRM]:  stock(ASSET_IDS.CRM, 'CRM', 'Salesforce', 'xCRM', '#00A1E0'),
  [ASSET_IDS.ORCL]: stock(ASSET_IDS.ORCL, 'ORCL', 'Oracle', 'xORCL', '#F80000'),
  [ASSET_IDS.IBM]:  stock(ASSET_IDS.IBM, 'IBM', 'IBM', 'xIBM', '#006699'),

  // ═══ DIA Equities — Industrial ═══
  [ASSET_IDS.GE]:  stock(ASSET_IDS.GE, 'GE', 'GE Aerospace', 'xGE', '#3B73B9'),
  [ASSET_IDS.CAT]: stock(ASSET_IDS.CAT, 'CAT', 'Caterpillar', 'xCAT', '#FFCD11'),
  [ASSET_IDS.BA]:  stock(ASSET_IDS.BA, 'BA', 'Boeing', 'xBA', '#0039A6'),
  [ASSET_IDS.HON]: stock(ASSET_IDS.HON, 'HON', 'Honeywell', 'xHON', '#E4002B'),
  [ASSET_IDS.UPS]: stock(ASSET_IDS.UPS, 'UPS', 'United Parcel Service', 'xUPS', '#351C15'),
  [ASSET_IDS.RTX]: stock(ASSET_IDS.RTX, 'RTX', 'RTX (Raytheon)', 'xRTX', '#003366'),

  // ═══ DIA Equities — Energy ═══
  [ASSET_IDS.XOM]: stock(ASSET_IDS.XOM, 'XOM', 'ExxonMobil', 'xXOM', '#ED1C24'),
  [ASSET_IDS.CVX]: stock(ASSET_IDS.CVX, 'CVX', 'Chevron', 'xCVX', '#0066B2'),
  [ASSET_IDS.COP]: stock(ASSET_IDS.COP, 'COP', 'ConocoPhillips', 'xCOP', '#ED1C24'),
  [ASSET_IDS.SLB]: stock(ASSET_IDS.SLB, 'SLB', 'Schlumberger', 'xSLB', '#0057B8'),
  [ASSET_IDS.NEE]: stock(ASSET_IDS.NEE, 'NEE', 'NextEra Energy', 'xNEE', '#5B9BD5'),

  // ═══ DIA Equities — Telecom ═══
  [ASSET_IDS.T]:     stock(ASSET_IDS.T, 'T', 'AT&T', 'xT', '#009FDB'),
  [ASSET_IDS.VZ]:    stock(ASSET_IDS.VZ, 'VZ', 'Verizon', 'xVZ', '#CD040B'),
  [ASSET_IDS.CMCSA]: stock(ASSET_IDS.CMCSA, 'CMCSA', 'Comcast', 'xCMCSA', '#0089CF'),

  // ═══ ADX Equities — Abu Dhabi Securities Exchange ═══
  [ASSET_IDS.FAB]:        adxStock(ASSET_IDS.FAB, 'FAB', 'First Abu Dhabi Bank', 'xFAB', '#0A5F38'),
  [ASSET_IDS.ALDAR]:      adxStock(ASSET_IDS.ALDAR, 'ALDAR', 'Aldar Properties', 'xALDAR', '#C62828'),
  [ASSET_IDS.ADIB]:       adxStock(ASSET_IDS.ADIB, 'ADIB', 'Abu Dhabi Islamic Bank', 'xADIB', '#2E7D32'),
  [ASSET_IDS.ALPHADHABI]: adxStock(ASSET_IDS.ALPHADHABI, 'ALPHADHABI', 'Alpha Dhabi Holding', 'xALPHADHABI', '#1565C0'),
  [ASSET_IDS.IHC]:        adxStock(ASSET_IDS.IHC, 'IHC', 'International Holding Co', 'xIHC', '#B8860B'),
  [ASSET_IDS.EIC]:        adxStock(ASSET_IDS.EIC, 'EIC', 'Emirates Insurance', 'xEIC', '#00838F'),
  [ASSET_IDS.TPZERO]:     adxStock(ASSET_IDS.TPZERO, 'TPZERO', 'Two Point Zero', 'xTPZERO', '#6A1B9A'),
  [ASSET_IDS.UNIONINS]:   adxStock(ASSET_IDS.UNIONINS, 'UNIONINS', 'Union Insurance', 'xUNIONINS', '#4E342E'),
  [ASSET_IDS.ESHRAQ]:     adxStock(ASSET_IDS.ESHRAQ, 'ESHRAQ', 'Eshraq Investments', 'xESHRAQ', '#E65100'),
  [ASSET_IDS.SUDATEL]:    adxStock(ASSET_IDS.SUDATEL, 'SUDATEL', 'Sudatel Telecom', 'xSUDATEL', '#283593'),

  // ═══ DIA Fiat / FX ═══
  [ASSET_IDS.EUR]: fx(ASSET_IDS.EUR, 'EUR', 'Euro', 'xEUR', '#003399'),
  [ASSET_IDS.GBP]: fx(ASSET_IDS.GBP, 'GBP', 'British Pound', 'xGBP', '#C8102E'),
  [ASSET_IDS.JPY]: fx(ASSET_IDS.JPY, 'JPY', 'Japanese Yen', 'xJPY', '#BC002D'),
  [ASSET_IDS.AUD]: fx(ASSET_IDS.AUD, 'AUD', 'Australian Dollar', 'xAUD', '#00843D'),
  [ASSET_IDS.CAD]: fx(ASSET_IDS.CAD, 'CAD', 'Canadian Dollar', 'xCAD', '#FF0000'),
  [ASSET_IDS.CHF]: fx(ASSET_IDS.CHF, 'CHF', 'Swiss Franc', 'xCHF', '#FF0000'),
  [ASSET_IDS.CNY]: fx(ASSET_IDS.CNY, 'CNY', 'Chinese Yuan', 'xCNY', '#DE2910'),
  [ASSET_IDS.NZD]: fx(ASSET_IDS.NZD, 'NZD', 'New Zealand Dollar', 'xNZD', '#00247D'),
  [ASSET_IDS.SEK]: fx(ASSET_IDS.SEK, 'SEK', 'Swedish Krona', 'xSEK', '#006AA7'),
  [ASSET_IDS.NOK]: fx(ASSET_IDS.NOK, 'NOK', 'Norwegian Krone', 'xNOK', '#EF2B2D'),
  [ASSET_IDS.SGD]: fx(ASSET_IDS.SGD, 'SGD', 'Singapore Dollar', 'xSGD', '#EF3340'),
  [ASSET_IDS.HKD]: fx(ASSET_IDS.HKD, 'HKD', 'Hong Kong Dollar', 'xHKD', '#DE2910'),
  [ASSET_IDS.KRW]: fx(ASSET_IDS.KRW, 'KRW', 'South Korean Won', 'xKRW', '#003478'),
};

// ─── Accessors ───────────────────────────────────────────────────────────────

export function getAssetMetadata(assetId: string): AssetMetadata | undefined {
  return ASSET_METADATA[assetId];
}

export function getAllAssetMetadata(): AssetMetadata[] {
  return Object.values(ASSET_METADATA);
}

export function getAssetsByCategory(category: AssetCategory): AssetMetadata[] {
  return Object.values(ASSET_METADATA).filter((a) => a.category === category);
}

export function getAssetColor(assetId: string): string {
  return ASSET_METADATA[assetId]?.color || '#888888';
}

export function getAssetIcon(assetId: string): string {
  return ASSET_METADATA[assetId]?.icon || '/commodities/default.svg';
}

/**
 * Enrich API asset data with local metadata
 */
export function enrichAssetWithMetadata(apiAsset: ApiAsset): AssetMetadata {
  const metadata = ASSET_METADATA[apiAsset.asset_id];

  const spreadPercent = apiAsset.spread_bps != null
    ? apiAsset.spread_bps / 100
    : apiAsset.spread;
  const status = apiAsset.is_paused ? 'paused' : (apiAsset.status || 'active');

  if (!metadata) {
    return {
      assetId: apiAsset.asset_id,
      symbol: apiAsset.symbol || 'UNKNOWN',
      name: apiAsset.name || 'Unknown Asset',
      tokenSymbol: apiAsset.symbol ? `x${apiAsset.symbol}` : 'xUNKNOWN',
      icon: '/commodities/default.svg',
      color: '#888888',
      description: apiAsset.name || '',
      category: 'commodity',
      decimals: 18,
      tokenAddress: apiAsset.token_address,
      spread: spreadPercent,
      status,
    };
  }

  return {
    ...metadata,
    tokenAddress: apiAsset.token_address || metadata.tokenAddress,
    name: apiAsset.name || metadata.name,
    symbol: apiAsset.symbol || metadata.symbol,
    spread: spreadPercent,
    status,
  };
}
