// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {PythAdapter} from "../src/oracle/adapters/PythAdapter.sol";
import {DIAAdapter} from "../src/oracle/adapters/DIAAdapter.sol";
import {RedStoneAdapter} from "../src/oracle/adapters/RedStoneAdapter.sol";
import {ManualOracleAdapter} from "../src/oracle/adapters/ManualOracleAdapter.sol";
import {OracleRouter} from "../src/oracle/OracleRouter.sol";
import {MockDirham} from "../src/tokens/MockDirham.sol";
import {CommodityTokenFactory} from "../src/tokens/CommodityTokenFactory.sol";
import {AssetRegistry} from "../src/core/AssetRegistry.sol";
import {LiquidityVault} from "../src/core/LiquidityVault.sol";
import {TradingEngine} from "../src/core/TradingEngine.sol";
import {UserRegistry} from "../src/access/UserRegistry.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";

/// @title RedeployAll
/// @notice Full fresh deploy with trusted price mode enabled.
///         Deploys oracle infra, DDSC stablecoin, factory, registry, vault, engine,
///         user registry, and registers all ~108 assets.
///         No price seeding needed — prices come off-chain via trusted mode.
contract RedeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address relayer = vm.envOr("RELAYER_ADDRESS", deployer);

        console.log("Deployer:", deployer);
        console.log("Relayer: ", relayer);

        vm.startBroadcast(deployerPrivateKey);

        // ========== 1. Oracle Infrastructure ==========
        PythAdapter pythAdapter = new PythAdapter(deployer);
        DIAAdapter diaAdapter = new DIAAdapter(deployer);
        RedStoneAdapter redStoneAdapter = new RedStoneAdapter(deployer);
        ManualOracleAdapter manualAdapter = new ManualOracleAdapter(deployer);
        OracleRouter router = new OracleRouter(deployer);

        router.addAdapter(address(pythAdapter));
        router.addAdapter(address(diaAdapter));
        router.addAdapter(address(redStoneAdapter));
        router.addAdapter(address(manualAdapter));
        router.setDefaultMaxStaleness(7200); // 2 hours

        if (relayer != deployer) {
            pythAdapter.addRelayer(relayer);
            diaAdapter.addRelayer(relayer);
            redStoneAdapter.addRelayer(relayer);
        }

        console.log("\n--- Oracle Infrastructure ---");
        console.log("OracleRouter:     ", address(router));
        console.log("PythAdapter:      ", address(pythAdapter));
        console.log("DIAAdapter:       ", address(diaAdapter));
        console.log("RedStoneAdapter:  ", address(redStoneAdapter));
        console.log("ManualAdapter:    ", address(manualAdapter));

        // ========== 2. Core Contracts ==========
        MockDirham ddsc = new MockDirham(); // Now "Dubai Digital Stablecoin" / "DDSC"
        CommodityTokenFactory factory = new CommodityTokenFactory(deployer);
        AssetRegistry registry = new AssetRegistry(deployer, address(factory));
        LiquidityVault vault = new LiquidityVault(deployer, address(ddsc));
        TradingEngine engine = new TradingEngine(
            deployer, address(router), address(vault), address(registry), address(ddsc)
        );
        UserRegistry userRegistry = new UserRegistry(deployer);

        // Wire up
        factory.setAuthorizedCreator(address(registry));
        registry.setTradingEngine(address(engine));
        vault.setTradingEngine(address(engine));
        engine.setUserRegistry(address(userRegistry));

        // Enable trusted price mode — prices come from frontend/middleware
        engine.setTrustedPriceMode(true);

        console.log("\n--- Core Contracts ---");
        console.log("DDSC (stablecoin):", address(ddsc));
        console.log("TokenFactory:     ", address(factory));
        console.log("AssetRegistry:    ", address(registry));
        console.log("LiquidityVault:   ", address(vault));
        console.log("TradingEngine:    ", address(engine));
        console.log("UserRegistry:     ", address(userRegistry));
        console.log("TrustedPriceMode: ", engine.trustedPriceMode());

        // ========== 3. Register Assets ==========

        // --- Pyth Commodities (6) ---
        registry.addAsset(AssetIds.GOLD,      "Gold",             "xGOLD",      30, 4000, 500);
        registry.addAsset(AssetIds.SILVER,    "Silver",           "xSILVER",    30, 4000, 500);
        registry.addAsset(AssetIds.OIL,       "Oil",              "xOIL",       50, 3000, 500);
        registry.addAsset(AssetIds.PLATINUM,  "Platinum",         "xPLATINUM",  30, 4000, 500);
        registry.addAsset(AssetIds.PALLADIUM, "Palladium",        "xPALLADIUM", 30, 4000, 500);
        registry.addAsset(AssetIds.BRENT,     "Brent Crude Oil",  "xBRENT",     50, 3000, 500);
        console.log("Registered 6 Pyth commodities");

        // --- RedStone Commodities (5) ---
        registry.addAsset(AssetIds.COPPER,  "Copper",      "xCOPPER",  40, 3000, 500);
        registry.addAsset(AssetIds.NATGAS,  "Natural Gas", "xNATGAS",  50, 3000, 500);
        registry.addAsset(AssetIds.CORN,    "Corn",        "xCORN",    40, 3000, 500);
        registry.addAsset(AssetIds.SOYBEAN, "Soybeans",    "xSOYBEAN", 40, 3000, 500);
        registry.addAsset(AssetIds.URANIUM, "Uranium",     "xURANIUM", 60, 3000, 500);
        console.log("Registered 5 RedStone commodities");

        // --- Yahoo Commodities (9) ---
        registry.addAsset(AssetIds.WHEAT,       "Wheat",       "xWHEAT",    40, 3000, 500);
        registry.addAsset(AssetIds.COFFEE,      "Coffee",      "xCOFFEE",   40, 3000, 500);
        registry.addAsset(AssetIds.SUGAR,       "Sugar",       "xSUGAR",    40, 3000, 500);
        registry.addAsset(AssetIds.COTTON,      "Cotton",      "xCOTTON",   40, 3000, 500);
        registry.addAsset(AssetIds.COCOA,       "Cocoa",       "xCOCOA",    40, 3000, 500);
        registry.addAsset(AssetIds.ALUMINUM,    "Aluminum",    "xALUMINUM", 40, 3000, 500);
        registry.addAsset(AssetIds.LUMBER,      "Lumber",      "xLUMBER",   50, 3000, 500);
        registry.addAsset(AssetIds.IRON,        "Iron Ore",    "xIRON",     50, 3000, 500);
        registry.addAsset(AssetIds.HEATING_OIL, "Heating Oil", "xHEATOIL",  50, 3000, 500);
        console.log("Registered 9 Yahoo commodities");

        // --- DIA ETFs (15) ---
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
        console.log("Registered 15 DIA ETFs");

        // --- DIA Equities (60) ---
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
        registry.addAsset(AssetIds.WMT,  "Walmart",        "xWMT",  20, 4000, 500);
        registry.addAsset(AssetIds.PG,   "Procter & Gamble", "xPG", 20, 4000, 500);
        registry.addAsset(AssetIds.KO,   "Coca-Cola",      "xKO",   20, 4000, 500);
        registry.addAsset(AssetIds.PEP,  "PepsiCo",        "xPEP",  20, 4000, 500);
        registry.addAsset(AssetIds.COST, "Costco",         "xCOST", 20, 4000, 500);
        registry.addAsset(AssetIds.HD,   "Home Depot",     "xHD",   20, 4000, 500);
        registry.addAsset(AssetIds.LOW,  "Lowe's",         "xLOW",  20, 4000, 500);
        registry.addAsset(AssetIds.DIS,  "Walt Disney",    "xDIS",  20, 4000, 500);
        registry.addAsset(AssetIds.NFLX, "Netflix",        "xNFLX", 20, 4000, 500);
        registry.addAsset(AssetIds.SBUX, "Starbucks",      "xSBUX", 20, 4000, 500);
        registry.addAsset(AssetIds.ABNB, "Airbnb",         "xABNB", 20, 4000, 500);
        registry.addAsset(AssetIds.UBER, "Uber",           "xUBER", 20, 4000, 500);
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
        registry.addAsset(AssetIds.GE,  "GE Aerospace",         "xGE",  20, 4000, 500);
        registry.addAsset(AssetIds.CAT, "Caterpillar",           "xCAT", 20, 4000, 500);
        registry.addAsset(AssetIds.BA,  "Boeing",                "xBA",  20, 4000, 500);
        registry.addAsset(AssetIds.HON, "Honeywell",             "xHON", 20, 4000, 500);
        registry.addAsset(AssetIds.UPS, "United Parcel Service", "xUPS", 20, 4000, 500);
        registry.addAsset(AssetIds.RTX, "RTX (Raytheon)",        "xRTX", 20, 4000, 500);
        // Energy
        registry.addAsset(AssetIds.XOM, "ExxonMobil",     "xXOM", 20, 4000, 500);
        registry.addAsset(AssetIds.CVX, "Chevron",         "xCVX", 20, 4000, 500);
        registry.addAsset(AssetIds.COP, "ConocoPhillips",  "xCOP", 20, 4000, 500);
        registry.addAsset(AssetIds.SLB, "Schlumberger",    "xSLB", 20, 4000, 500);
        registry.addAsset(AssetIds.NEE, "NextEra Energy",  "xNEE", 20, 4000, 500);
        // Telecom
        registry.addAsset(AssetIds.T,     "AT&T",    "xT",     20, 4000, 500);
        registry.addAsset(AssetIds.VZ,    "Verizon", "xVZ",    20, 4000, 500);
        registry.addAsset(AssetIds.CMCSA, "Comcast", "xCMCSA", 20, 4000, 500);
        console.log("Registered 60 DIA Equities");

        // --- DIA FX (13) ---
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
        console.log("Registered 13 DIA FX pairs");

        vm.stopBroadcast();

        console.log("\n=== RedeployAll complete ===");
        console.log("Total assets: 108 (6 Pyth + 5 RedStone + 9 Yahoo + 15 ETF + 60 Equities + 13 FX)");
        console.log("Trusted price mode: ENABLED");
        console.log("No price seeding needed - prices come off-chain");
    }
}
