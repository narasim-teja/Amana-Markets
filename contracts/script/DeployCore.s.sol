// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MockDirham} from "../src/tokens/MockDirham.sol";
import {CommodityTokenFactory} from "../src/tokens/CommodityTokenFactory.sol";
import {AssetRegistry} from "../src/core/AssetRegistry.sol";
import {LiquidityVault} from "../src/core/LiquidityVault.sol";
import {TradingEngine} from "../src/core/TradingEngine.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";
import {UserRegistry} from "../src/access/UserRegistry.sol";

/// @title DeployCore
/// @notice Deploys all Step 2 contracts and wires them together.
///         Requires ORACLE_ROUTER env var (deployed in Step 1).
contract DeployCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address oracleRouter = vm.envAddress("ORACLE_ROUTER");

        console.log("Deployer:      ", deployer);
        console.log("OracleRouter:  ", oracleRouter);

        vm.startBroadcast(deployerPrivateKey);

        // --- Deploy contracts ---
        MockDirham mockDirham = new MockDirham();
        console.log("MockDirham:    ", address(mockDirham));

        CommodityTokenFactory factory = new CommodityTokenFactory(deployer);
        console.log("TokenFactory:  ", address(factory));

        AssetRegistry registry = new AssetRegistry(deployer, address(factory));
        console.log("AssetRegistry: ", address(registry));

        LiquidityVault vault = new LiquidityVault(deployer, address(mockDirham));
        console.log("LiquidityVault:", address(vault));

        TradingEngine engine =
            new TradingEngine(deployer, oracleRouter, address(vault), address(registry), address(mockDirham));
        console.log("TradingEngine: ", address(engine));

        UserRegistry userRegistry = new UserRegistry(deployer);
        console.log("UserRegistry:  ", address(userRegistry));

        // --- Wire up ---
        factory.setAuthorizedCreator(address(registry));
        registry.setTradingEngine(address(engine));
        vault.setTradingEngine(address(engine));
        engine.setUserRegistry(address(userRegistry));
        vault.setUserRegistry(address(userRegistry));

        // --- Add assets ---
        registry.addAsset(AssetIds.GOLD, "Gold", "xGOLD", 30, 4000, 500);
        registry.addAsset(AssetIds.SILVER, "Silver", "xSILVER", 30, 4000, 500);
        registry.addAsset(AssetIds.OIL, "Oil", "xOIL", 50, 3000, 500);

        console.log("xGOLD:         ", factory.getToken(AssetIds.GOLD));
        console.log("xSILVER:       ", factory.getToken(AssetIds.SILVER));
        console.log("xOIL:          ", factory.getToken(AssetIds.OIL));

        vm.stopBroadcast();

        console.log("\n=== Step 2 deployment complete ===");
    }
}
