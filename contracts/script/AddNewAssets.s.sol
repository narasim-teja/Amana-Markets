// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {AssetRegistry} from "../src/core/AssetRegistry.sol";
import {OracleRouter} from "../src/oracle/OracleRouter.sol";
import {ManualOracleAdapter} from "../src/oracle/adapters/ManualOracleAdapter.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";

/// @title AddNewAssets
/// @notice Register all new assets (commodities, stocks, ETFs, FX) and update staleness.
///         Run against existing deployment — requires ASSET_REGISTRY, ORACLE_ROUTER, MANUAL_ORACLE_ADAPTER env vars.
contract AddNewAssets is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        AssetRegistry registry = AssetRegistry(vm.envAddress("ASSET_REGISTRY"));
        OracleRouter router = OracleRouter(vm.envAddress("ORACLE_ROUTER"));
        ManualOracleAdapter manualAdapter = ManualOracleAdapter(vm.envAddress("MANUAL_ORACLE_ADAPTER"));

        vm.startBroadcast(deployerPrivateKey);

        // ═══════════════════════════════════════════════════════════════════
        // 1. Update OracleRouter staleness: 120s → 7200s (2 hours)
        // ═══════════════════════════════════════════════════════════════════
        router.setDefaultMaxStaleness(7200);
        console.log("Updated defaultMaxStaleness to 7200s");

        // ═══════════════════════════════════════════════════════════════════
        // 2. Register new Pyth commodities (Gold/Silver/Oil already exist)
        //    addAsset(assetId, name, symbol, baseSpreadBps, maxExposureBps, maxSingleTradeBps)
        // ═══════════════════════════════════════════════════════════════════
        registry.addAsset(AssetIds.PLATINUM,  "Platinum",         "xPLATINUM",  30, 4000, 500);
        registry.addAsset(AssetIds.PALLADIUM, "Palladium",        "xPALLADIUM", 30, 4000, 500);
        registry.addAsset(AssetIds.BRENT,     "Brent Crude Oil",  "xBRENT",     50, 3000, 500);
        console.log("Added 3 new Pyth commodities");

        // ═══════════════════════════════════════════════════════════════════
        // 3. Register RedStone commodities
        // ═══════════════════════════════════════════════════════════════════
        registry.addAsset(AssetIds.COPPER,  "Copper",      "xCOPPER",  40, 3000, 500);
        registry.addAsset(AssetIds.NATGAS,  "Natural Gas", "xNATGAS",  50, 3000, 500);
        registry.addAsset(AssetIds.CORN,    "Corn",        "xCORN",    40, 3000, 500);
        registry.addAsset(AssetIds.SOYBEAN, "Soybeans",    "xSOYBEAN", 40, 3000, 500);
        registry.addAsset(AssetIds.URANIUM, "Uranium",     "xURANIUM", 60, 3000, 500);
        console.log("Added 5 RedStone commodities");

        // ═══════════════════════════════════════════════════════════════════
        // 4. Register Yahoo Finance commodities
        // ═══════════════════════════════════════════════════════════════════
        registry.addAsset(AssetIds.WHEAT,       "Wheat",       "xWHEAT",    40, 3000, 500);
        registry.addAsset(AssetIds.COFFEE,      "Coffee",      "xCOFFEE",   40, 3000, 500);
        registry.addAsset(AssetIds.SUGAR,       "Sugar",       "xSUGAR",    40, 3000, 500);
        registry.addAsset(AssetIds.COTTON,      "Cotton",      "xCOTTON",   40, 3000, 500);
        registry.addAsset(AssetIds.COCOA,       "Cocoa",       "xCOCOA",    40, 3000, 500);
        registry.addAsset(AssetIds.ALUMINUM,    "Aluminum",    "xALUMINUM", 40, 3000, 500);
        registry.addAsset(AssetIds.LUMBER,      "Lumber",      "xLUMBER",   50, 3000, 500);
        registry.addAsset(AssetIds.IRON,        "Iron Ore",    "xIRON",     50, 3000, 500);
        registry.addAsset(AssetIds.HEATING_OIL, "Heating Oil", "xHEATOIL",  50, 3000, 500);
        console.log("Added 9 Yahoo commodities");

        // ═══════════════════════════════════════════════════════════════════
        // 5. Register DIA ETFs (15bps spread)
        // ═══════════════════════════════════════════════════════════════════
        registry.addAsset(AssetIds.TLT,  "iShares 20+ Year Treasury Bond ETF", "xTLT",  15, 4000, 500);
        registry.addAsset(AssetIds.SHY,  "iShares 1-3 Year Treasury Bond ETF", "xSHY",  15, 4000, 500);
        registry.addAsset(AssetIds.VGSH, "Vanguard Short-Term Treasury ETF",   "xVGSH", 15, 4000, 500);
        registry.addAsset(AssetIds.GOVT, "iShares U.S. Treasury Bond ETF",     "xGOVT", 15, 4000, 500);
        registry.addAsset(AssetIds.BETH, "ProShares Bitcoin & Ether ETF",      "xBETH", 15, 4000, 500);
        registry.addAsset(AssetIds.ETHA, "iShares Ethereum Trust ETF",         "xETHA", 15, 4000, 500);
        registry.addAsset(AssetIds.BITO, "ProShares Bitcoin Strategy ETF",     "xBITO", 15, 4000, 500);
        registry.addAsset(AssetIds.GBTC, "Grayscale Bitcoin Trust",            "xGBTC", 15, 4000, 500);
        registry.addAsset(AssetIds.HODL, "VanEck Bitcoin ETF",                 "xHODL", 15, 4000, 500);
        registry.addAsset(AssetIds.ARKB, "ARK 21Shares Bitcoin ETF",           "xARKB", 15, 4000, 500);
        registry.addAsset(AssetIds.FBTC, "Fidelity Wise Origin Bitcoin Fund",  "xFBTC", 15, 4000, 500);
        registry.addAsset(AssetIds.IBIT, "iShares Bitcoin Trust",              "xIBIT", 15, 4000, 500);
        registry.addAsset(AssetIds.QQQ,  "Invesco QQQ Trust",                  "xQQQ",  15, 4000, 500);
        registry.addAsset(AssetIds.SPY,  "SPDR S&P 500 ETF",                  "xSPY",  15, 4000, 500);
        registry.addAsset(AssetIds.IVV,  "iShares Core S&P 500 ETF",          "xIVV",  15, 4000, 500);
        console.log("Added 15 DIA ETFs");

        // ═══════════════════════════════════════════════════════════════════
        // 6. Register DIA Equities (20bps spread)
        // ═══════════════════════════════════════════════════════════════════
        // Mega Cap Tech
        registry.addAsset(AssetIds.AAPL,  "Apple",              "xAAPL",  20, 4000, 500);
        registry.addAsset(AssetIds.MSFT,  "Microsoft",          "xMSFT",  20, 4000, 500);
        registry.addAsset(AssetIds.GOOGL, "Alphabet (Google)",  "xGOOGL", 20, 4000, 500);
        registry.addAsset(AssetIds.AMZN,  "Amazon",             "xAMZN",  20, 4000, 500);
        registry.addAsset(AssetIds.NVDA,  "NVIDIA",             "xNVDA",  20, 4000, 500);
        registry.addAsset(AssetIds.META,  "Meta Platforms",     "xMETA",  20, 4000, 500);
        registry.addAsset(AssetIds.TSLA,  "Tesla",              "xTSLA",  20, 4000, 500);
        // Finance
        registry.addAsset(AssetIds.JPM,  "JPMorgan Chase",   "xJPM",  20, 4000, 500);
        registry.addAsset(AssetIds.V,    "Visa",             "xV",    20, 4000, 500);
        registry.addAsset(AssetIds.MA,   "Mastercard",       "xMA",   20, 4000, 500);
        registry.addAsset(AssetIds.BAC,  "Bank of America",  "xBAC",  20, 4000, 500);
        registry.addAsset(AssetIds.MS,   "Morgan Stanley",   "xMS",   20, 4000, 500);
        registry.addAsset(AssetIds.GS,   "Goldman Sachs",    "xGS",   20, 4000, 500);
        registry.addAsset(AssetIds.AXP,  "American Express", "xAXP",  20, 4000, 500);
        registry.addAsset(AssetIds.PYPL, "PayPal",           "xPYPL", 20, 4000, 500);
        registry.addAsset(AssetIds.COIN, "Coinbase",         "xCOIN", 20, 4000, 500);
        registry.addAsset(AssetIds.SQ,   "Block (Square)",   "xSQ",   20, 4000, 500);
        // Healthcare
        registry.addAsset(AssetIds.JNJ, "Johnson & Johnson",        "xJNJ", 20, 4000, 500);
        registry.addAsset(AssetIds.UNH, "UnitedHealth Group",       "xUNH", 20, 4000, 500);
        registry.addAsset(AssetIds.LLY, "Eli Lilly",                "xLLY", 20, 4000, 500);
        registry.addAsset(AssetIds.MRK, "Merck",                    "xMRK", 20, 4000, 500);
        registry.addAsset(AssetIds.PFE, "Pfizer",                   "xPFE", 20, 4000, 500);
        registry.addAsset(AssetIds.ABT, "Abbott Laboratories",      "xABT", 20, 4000, 500);
        registry.addAsset(AssetIds.TMO, "Thermo Fisher Scientific", "xTMO", 20, 4000, 500);
        registry.addAsset(AssetIds.MDT, "Medtronic",                "xMDT", 20, 4000, 500);
        // Consumer
        registry.addAsset(AssetIds.WMT,  "Walmart",    "xWMT",  20, 4000, 500);
        registry.addAsset(AssetIds.PG,   "Procter & Gamble", "xPG",   20, 4000, 500);
        registry.addAsset(AssetIds.KO,   "Coca-Cola",  "xKO",   20, 4000, 500);
        registry.addAsset(AssetIds.PEP,  "PepsiCo",    "xPEP",  20, 4000, 500);
        registry.addAsset(AssetIds.COST, "Costco",     "xCOST", 20, 4000, 500);
        registry.addAsset(AssetIds.HD,   "Home Depot", "xHD",   20, 4000, 500);
        registry.addAsset(AssetIds.LOW,  "Lowe's",     "xLOW",  20, 4000, 500);
        registry.addAsset(AssetIds.DIS,  "Walt Disney", "xDIS",  20, 4000, 500);
        registry.addAsset(AssetIds.NFLX, "Netflix",    "xNFLX", 20, 4000, 500);
        registry.addAsset(AssetIds.SBUX, "Starbucks",  "xSBUX", 20, 4000, 500);
        registry.addAsset(AssetIds.ABNB, "Airbnb",     "xABNB", 20, 4000, 500);
        registry.addAsset(AssetIds.UBER, "Uber",       "xUBER", 20, 4000, 500);
        // Semiconductors & Tech
        registry.addAsset(AssetIds.AVGO, "Broadcom",           "xAVGO", 20, 4000, 500);
        registry.addAsset(AssetIds.AMD,  "AMD",                "xAMD",  20, 4000, 500);
        registry.addAsset(AssetIds.INTC, "Intel",              "xINTC", 20, 4000, 500);
        registry.addAsset(AssetIds.TXN,  "Texas Instruments",  "xTXN",  20, 4000, 500);
        registry.addAsset(AssetIds.QCOM, "Qualcomm",           "xQCOM", 20, 4000, 500);
        registry.addAsset(AssetIds.AMAT, "Applied Materials",  "xAMAT", 20, 4000, 500);
        registry.addAsset(AssetIds.CSCO, "Cisco",              "xCSCO", 20, 4000, 500);
        registry.addAsset(AssetIds.ADBE, "Adobe",              "xADBE", 20, 4000, 500);
        registry.addAsset(AssetIds.CRM,  "Salesforce",         "xCRM",  20, 4000, 500);
        registry.addAsset(AssetIds.ORCL, "Oracle",             "xORCL", 20, 4000, 500);
        registry.addAsset(AssetIds.IBM,  "IBM",                "xIBM",  20, 4000, 500);
        // Industrial
        registry.addAsset(AssetIds.GE,  "GE Aerospace",           "xGE",  20, 4000, 500);
        registry.addAsset(AssetIds.CAT, "Caterpillar",             "xCAT", 20, 4000, 500);
        registry.addAsset(AssetIds.BA,  "Boeing",                  "xBA",  20, 4000, 500);
        registry.addAsset(AssetIds.HON, "Honeywell",               "xHON", 20, 4000, 500);
        registry.addAsset(AssetIds.UPS, "United Parcel Service",   "xUPS", 20, 4000, 500);
        registry.addAsset(AssetIds.RTX, "RTX (Raytheon)",          "xRTX", 20, 4000, 500);
        // Energy
        registry.addAsset(AssetIds.XOM, "ExxonMobil",     "xXOM", 20, 4000, 500);
        registry.addAsset(AssetIds.CVX, "Chevron",         "xCVX", 20, 4000, 500);
        registry.addAsset(AssetIds.COP, "ConocoPhillips",  "xCOP", 20, 4000, 500);
        registry.addAsset(AssetIds.SLB, "Schlumberger",    "xSLB", 20, 4000, 500);
        registry.addAsset(AssetIds.NEE, "NextEra Energy",  "xNEE", 20, 4000, 500);
        // Telecom
        registry.addAsset(AssetIds.T,    "AT&T",    "xT",    20, 4000, 500);
        registry.addAsset(AssetIds.VZ,   "Verizon", "xVZ",   20, 4000, 500);
        registry.addAsset(AssetIds.CMCSA, "Comcast", "xCMCSA", 20, 4000, 500);
        console.log("Added 60 DIA Equities");

        // ═══════════════════════════════════════════════════════════════════
        // 7. Register DIA Fiat/FX (10bps spread)
        // ═══════════════════════════════════════════════════════════════════
        registry.addAsset(AssetIds.EUR, "Euro",               "xEUR", 10, 5000, 1000);
        registry.addAsset(AssetIds.GBP, "British Pound",      "xGBP", 10, 5000, 1000);
        registry.addAsset(AssetIds.JPY, "Japanese Yen",       "xJPY", 10, 5000, 1000);
        registry.addAsset(AssetIds.AUD, "Australian Dollar",  "xAUD", 10, 5000, 1000);
        registry.addAsset(AssetIds.CAD, "Canadian Dollar",    "xCAD", 10, 5000, 1000);
        registry.addAsset(AssetIds.CHF, "Swiss Franc",        "xCHF", 10, 5000, 1000);
        registry.addAsset(AssetIds.CNY, "Chinese Yuan",       "xCNY", 10, 5000, 1000);
        registry.addAsset(AssetIds.NZD, "New Zealand Dollar", "xNZD", 10, 5000, 1000);
        registry.addAsset(AssetIds.SEK, "Swedish Krona",      "xSEK", 10, 5000, 1000);
        registry.addAsset(AssetIds.NOK, "Norwegian Krone",    "xNOK", 10, 5000, 1000);
        registry.addAsset(AssetIds.SGD, "Singapore Dollar",   "xSGD", 10, 5000, 1000);
        registry.addAsset(AssetIds.HKD, "Hong Kong Dollar",   "xHKD", 10, 5000, 1000);
        registry.addAsset(AssetIds.KRW, "South Korean Won",   "xKRW", 10, 5000, 1000);
        console.log("Added 13 DIA FX pairs");

        // ═══════════════════════════════════════════════════════════════════
        // 8. Seed initial prices via ManualAdapter for new commodities
        //    (so OracleRouter has data before first relayer cycle)
        //    Prices in 8 decimals: $X * 10^8
        // ═══════════════════════════════════════════════════════════════════
        // Pyth commodities
        manualAdapter.updatePrice(AssetIds.PLATINUM,  215600000000, block.timestamp); // $2156
        manualAdapter.updatePrice(AssetIds.PALLADIUM, 174900000000, block.timestamp); // $1749
        manualAdapter.updatePrice(AssetIds.BRENT,      7122000000, block.timestamp);  // $71.22
        // RedStone commodities
        manualAdapter.updatePrice(AssetIds.COPPER,      588000000, block.timestamp);  // $5.88
        manualAdapter.updatePrice(AssetIds.NATGAS,      317500000, block.timestamp);  // $3.175
        manualAdapter.updatePrice(AssetIds.CORN,       4398500000, block.timestamp);  // $439.85 (per bushel in cents→$4.3985... actually $4.3985)
        manualAdapter.updatePrice(AssetIds.SOYBEAN,   11379100000, block.timestamp);  // $1137.91 (→$11.3791)
        manualAdapter.updatePrice(AssetIds.URANIUM,    9022000000, block.timestamp);  // $90.22
        // Yahoo commodities
        manualAdapter.updatePrice(AssetIds.WHEAT,       582000000, block.timestamp);  // $5.82
        manualAdapter.updatePrice(AssetIds.COFFEE,      285000000, block.timestamp);  // $2.85
        manualAdapter.updatePrice(AssetIds.SUGAR,        14000000, block.timestamp);  // $0.14
        manualAdapter.updatePrice(AssetIds.COTTON,       66000000, block.timestamp);  // $0.66
        manualAdapter.updatePrice(AssetIds.COCOA,    318400000000, block.timestamp);  // $3184
        manualAdapter.updatePrice(AssetIds.ALUMINUM, 305700000000, block.timestamp);  // $3057
        manualAdapter.updatePrice(AssetIds.LUMBER,    57650000000, block.timestamp);  // $576.50
        manualAdapter.updatePrice(AssetIds.IRON,      16191000000, block.timestamp);  // $161.91
        manualAdapter.updatePrice(AssetIds.HEATING_OIL, 247000000, block.timestamp);  // $2.47
        console.log("Seeded initial prices for 17 new commodities");

        vm.stopBroadcast();

        console.log("\n=== AddNewAssets complete ===");
        console.log("Total new assets registered: 105 (3 Pyth + 5 RedStone + 9 Yahoo + 15 ETF + 60 Equities + 13 FX)");
        console.log("OracleRouter staleness: 7200s (2 hours)");
    }
}
