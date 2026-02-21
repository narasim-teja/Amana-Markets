// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {AssetRegistry} from "../src/core/AssetRegistry.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";

/// @title RegisterADXStocks
/// @notice Registers 10 Abu Dhabi Securities Exchange (ADX) stocks on the existing AssetRegistry.
///         Run against a live deployment — reads ASSET_REGISTRY address from env.
contract RegisterADXStocks is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddr = vm.envAddress("ASSET_REGISTRY");

        console.log("AssetRegistry:", registryAddr);

        AssetRegistry registry = AssetRegistry(registryAddr);

        vm.startBroadcast(deployerPrivateKey);

        // --- ADX Equities (10) ---
        // spreadBps=20, maxExposureBps=4000, maxSingleTradeBps=500 (same as US equities)
        registry.addAsset(AssetIds.FAB,        "First Abu Dhabi Bank",        "xFAB",        20, 4000, 500);
        registry.addAsset(AssetIds.ALDAR,      "Aldar Properties",            "xALDAR",      20, 4000, 500);
        registry.addAsset(AssetIds.ADIB,       "Abu Dhabi Islamic Bank",      "xADIB",       20, 4000, 500);
        registry.addAsset(AssetIds.ALPHADHABI, "Alpha Dhabi Holding",         "xALPHADHABI", 20, 4000, 500);
        registry.addAsset(AssetIds.IHC,        "International Holding Co",    "xIHC",        20, 4000, 500);
        registry.addAsset(AssetIds.EIC,        "Emirates Insurance",          "xEIC",        20, 4000, 500);
        registry.addAsset(AssetIds.TPZERO,     "Two Point Zero",              "xTPZERO",     20, 4000, 500);
        registry.addAsset(AssetIds.UNIONINS,   "Union Insurance",             "xUNIONINS",   20, 4000, 500);
        registry.addAsset(AssetIds.ESHRAQ,     "Eshraq Investments",          "xESHRAQ",     20, 4000, 500);
        registry.addAsset(AssetIds.SUDATEL,    "Sudatel Telecom Group",       "xSUDATEL",    20, 4000, 500);

        vm.stopBroadcast();

        console.log("Registered 10 ADX Equities on existing registry");
    }
}
