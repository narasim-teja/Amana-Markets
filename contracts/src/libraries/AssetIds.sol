// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library AssetIds {
    // ═══ Pyth Commodities ═══
    bytes32 public constant GOLD = keccak256("XAU/USD");
    bytes32 public constant SILVER = keccak256("XAG/USD");
    bytes32 public constant PLATINUM = keccak256("XPT/USD");
    bytes32 public constant PALLADIUM = keccak256("XPD/USD");
    bytes32 public constant OIL = keccak256("WTI/USD");
    bytes32 public constant BRENT = keccak256("BRT/USD");

    // ═══ RedStone Commodities ═══
    bytes32 public constant COPPER = keccak256("XCU/USD");
    bytes32 public constant NATGAS = keccak256("NG/USD");
    bytes32 public constant CORN = keccak256("CORN/USD");
    bytes32 public constant SOYBEAN = keccak256("SOYBEAN/USD");
    bytes32 public constant URANIUM = keccak256("URANIUM/USD");

    // ═══ Yahoo Commodities ═══
    bytes32 public constant WHEAT = keccak256("WHEAT/USD");
    bytes32 public constant COFFEE = keccak256("COFFEE/USD");
    bytes32 public constant SUGAR = keccak256("SUGAR/USD");
    bytes32 public constant COTTON = keccak256("COTTON/USD");
    bytes32 public constant COCOA = keccak256("COCOA/USD");
    bytes32 public constant ALUMINUM = keccak256("ALU/USD");
    bytes32 public constant LUMBER = keccak256("LUMBER/USD");
    bytes32 public constant IRON = keccak256("IRON/USD");
    bytes32 public constant HEATING_OIL = keccak256("HEAT/USD");

    // ═══ DIA ETFs ═══
    bytes32 public constant TLT = keccak256("TLT/USD");
    bytes32 public constant SHY = keccak256("SHY/USD");
    bytes32 public constant VGSH = keccak256("VGSH/USD");
    bytes32 public constant GOVT = keccak256("GOVT/USD");
    bytes32 public constant BETH = keccak256("BETH/USD");
    bytes32 public constant ETHA = keccak256("ETHA/USD");
    bytes32 public constant BITO = keccak256("BITO/USD");
    bytes32 public constant GBTC = keccak256("GBTC/USD");
    bytes32 public constant HODL = keccak256("HODL/USD");
    bytes32 public constant ARKB = keccak256("ARKB/USD");
    bytes32 public constant FBTC = keccak256("FBTC/USD");
    bytes32 public constant IBIT = keccak256("IBIT/USD");
    bytes32 public constant QQQ = keccak256("QQQ/USD");
    bytes32 public constant SPY = keccak256("SPY/USD");
    bytes32 public constant IVV = keccak256("IVV/USD");

    // ═══ DIA Equities ═══
    bytes32 public constant AAPL = keccak256("AAPL/USD");
    bytes32 public constant MSFT = keccak256("MSFT/USD");
    bytes32 public constant GOOGL = keccak256("GOOGL/USD");
    bytes32 public constant AMZN = keccak256("AMZN/USD");
    bytes32 public constant NVDA = keccak256("NVDA/USD");
    bytes32 public constant META = keccak256("META/USD");
    bytes32 public constant TSLA = keccak256("TSLA/USD");
    bytes32 public constant JPM = keccak256("JPM/USD");
    bytes32 public constant V = keccak256("V/USD");
    bytes32 public constant MA = keccak256("MA/USD");
    bytes32 public constant BAC = keccak256("BAC/USD");
    bytes32 public constant MS = keccak256("MS/USD");
    bytes32 public constant GS = keccak256("GS/USD");
    bytes32 public constant AXP = keccak256("AXP/USD");
    bytes32 public constant PYPL = keccak256("PYPL/USD");
    bytes32 public constant COIN = keccak256("COIN/USD");
    bytes32 public constant SQ = keccak256("SQ/USD");
    bytes32 public constant JNJ = keccak256("JNJ/USD");
    bytes32 public constant UNH = keccak256("UNH/USD");
    bytes32 public constant LLY = keccak256("LLY/USD");
    bytes32 public constant MRK = keccak256("MRK/USD");
    bytes32 public constant PFE = keccak256("PFE/USD");
    bytes32 public constant ABT = keccak256("ABT/USD");
    bytes32 public constant TMO = keccak256("TMO/USD");
    bytes32 public constant MDT = keccak256("MDT/USD");
    bytes32 public constant WMT = keccak256("WMT/USD");
    bytes32 public constant PG = keccak256("PG/USD");
    bytes32 public constant KO = keccak256("KO/USD");
    bytes32 public constant PEP = keccak256("PEP/USD");
    bytes32 public constant COST = keccak256("COST/USD");
    bytes32 public constant HD = keccak256("HD/USD");
    bytes32 public constant LOW = keccak256("LOW/USD");
    bytes32 public constant DIS = keccak256("DIS/USD");
    bytes32 public constant NFLX = keccak256("NFLX/USD");
    bytes32 public constant SBUX = keccak256("SBUX/USD");
    bytes32 public constant ABNB = keccak256("ABNB/USD");
    bytes32 public constant UBER = keccak256("UBER/USD");
    bytes32 public constant AVGO = keccak256("AVGO/USD");
    bytes32 public constant AMD = keccak256("AMD/USD");
    bytes32 public constant INTC = keccak256("INTC/USD");
    bytes32 public constant TXN = keccak256("TXN/USD");
    bytes32 public constant QCOM = keccak256("QCOM/USD");
    bytes32 public constant AMAT = keccak256("AMAT/USD");
    bytes32 public constant CSCO = keccak256("CSCO/USD");
    bytes32 public constant ADBE = keccak256("ADBE/USD");
    bytes32 public constant CRM = keccak256("CRM/USD");
    bytes32 public constant ORCL = keccak256("ORCL/USD");
    bytes32 public constant IBM = keccak256("IBM/USD");
    bytes32 public constant GE = keccak256("GE/USD");
    bytes32 public constant CAT = keccak256("CAT/USD");
    bytes32 public constant BA = keccak256("BA/USD");
    bytes32 public constant HON = keccak256("HON/USD");
    bytes32 public constant UPS = keccak256("UPS/USD");
    bytes32 public constant RTX = keccak256("RTX/USD");
    bytes32 public constant XOM = keccak256("XOM/USD");
    bytes32 public constant CVX = keccak256("CVX/USD");
    bytes32 public constant COP = keccak256("COP/USD");
    bytes32 public constant SLB = keccak256("SLB/USD");
    bytes32 public constant NEE = keccak256("NEE/USD");
    bytes32 public constant T = keccak256("T/USD");
    bytes32 public constant VZ = keccak256("VZ/USD");
    bytes32 public constant CMCSA = keccak256("CMCSA/USD");

    // ═══ DIA Fiat / FX ═══
    bytes32 public constant EUR = keccak256("EUR/USD");
    bytes32 public constant GBP = keccak256("GBP/USD");
    bytes32 public constant JPY = keccak256("JPY/USD");
    bytes32 public constant AUD = keccak256("AUD/USD");
    bytes32 public constant CAD = keccak256("CAD/USD");
    bytes32 public constant CHF = keccak256("CHF/USD");
    bytes32 public constant CNY = keccak256("CNY/USD");
    bytes32 public constant NZD = keccak256("NZD/USD");
    bytes32 public constant SEK = keccak256("SEK/USD");
    bytes32 public constant NOK = keccak256("NOK/USD");
    bytes32 public constant SGD = keccak256("SGD/USD");
    bytes32 public constant HKD = keccak256("HKD/USD");
    bytes32 public constant KRW = keccak256("KRW/USD");
}
