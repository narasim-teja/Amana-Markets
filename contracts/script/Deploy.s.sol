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
import {AssetIds} from "../src/libraries/AssetIds.sol";

/// @title Deploy
/// @notice Combined Step 1 + Step 2 deployment for fresh chains.
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address relayer = vm.envOr("RELAYER_ADDRESS", deployer);

        console.log("Deployer:", deployer);
        console.log("Relayer: ", relayer);

        vm.startBroadcast(deployerPrivateKey);

        // ========== Step 1: Oracle Infrastructure ==========

        PythAdapter pythAdapter = new PythAdapter(deployer);
        DIAAdapter diaAdapter = new DIAAdapter(deployer);
        RedStoneAdapter redStoneAdapter = new RedStoneAdapter(deployer);
        ManualOracleAdapter manualAdapter = new ManualOracleAdapter(deployer);
        OracleRouter router = new OracleRouter(deployer);

        router.addAdapter(address(pythAdapter));
        router.addAdapter(address(diaAdapter));
        router.addAdapter(address(redStoneAdapter));
        router.addAdapter(address(manualAdapter));

        if (relayer != deployer) {
            pythAdapter.addRelayer(relayer);
            diaAdapter.addRelayer(relayer);
            redStoneAdapter.addRelayer(relayer);
        }

        // Seed prices
        manualAdapter.updatePrice(AssetIds.GOLD, 265000000000, block.timestamp);
        manualAdapter.updatePrice(AssetIds.SILVER, 3150000000, block.timestamp);
        manualAdapter.updatePrice(AssetIds.OIL, 7200000000, block.timestamp);

        console.log("\n--- Step 1: Oracles ---");
        console.log("OracleRouter:     ", address(router));
        console.log("ManualAdapter:    ", address(manualAdapter));

        // ========== Step 2: Core Trading ==========

        MockDirham mockDirham = new MockDirham();
        CommodityTokenFactory factory = new CommodityTokenFactory(deployer);
        AssetRegistry registry = new AssetRegistry(deployer, address(factory));
        LiquidityVault vault = new LiquidityVault(deployer, address(mockDirham));
        TradingEngine engine =
            new TradingEngine(deployer, address(router), address(vault), address(registry), address(mockDirham));

        factory.setAuthorizedCreator(address(registry));
        registry.setTradingEngine(address(engine));
        vault.setTradingEngine(address(engine));

        registry.addAsset(AssetIds.GOLD, "Gold", "xGOLD", 30, 4000, 500);
        registry.addAsset(AssetIds.SILVER, "Silver", "xSILVER", 30, 4000, 500);
        registry.addAsset(AssetIds.OIL, "Oil", "xOIL", 50, 3000, 500);

        console.log("\n--- Step 2: Core Trading ---");
        console.log("MockDirham:       ", address(mockDirham));
        console.log("TokenFactory:     ", address(factory));
        console.log("AssetRegistry:    ", address(registry));
        console.log("LiquidityVault:   ", address(vault));
        console.log("TradingEngine:    ", address(engine));
        console.log("xGOLD:            ", factory.getToken(AssetIds.GOLD));
        console.log("xSILVER:          ", factory.getToken(AssetIds.SILVER));
        console.log("xOIL:             ", factory.getToken(AssetIds.OIL));

        vm.stopBroadcast();

        console.log("\n=== Full deployment complete ===");
    }
}
