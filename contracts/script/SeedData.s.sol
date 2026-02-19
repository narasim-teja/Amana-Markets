// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MockDirham} from "../src/tokens/MockDirham.sol";
import {LiquidityVault} from "../src/core/LiquidityVault.sol";
import {TradingEngine} from "../src/core/TradingEngine.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";

/// @title SeedData
/// @notice Seeds vault with liquidity and executes test trades after DeployCore.
contract SeedData is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        MockDirham mockDirham = MockDirham(vm.envAddress("MOCK_DIRHAM"));
        LiquidityVault vault = LiquidityVault(vm.envAddress("LIQUIDITY_VAULT"));
        TradingEngine engine = TradingEngine(vm.envAddress("TRADING_ENGINE"));

        vm.startBroadcast(deployerPrivateKey);

        // --- Mint mAED to deployer ---
        uint256 mintAmount = 2_000_000e6; // 2M mAED
        mockDirham.mint(deployer, mintAmount);
        console.log("Minted %s mAED to deployer", mintAmount);

        // --- Seed vault with liquidity ---
        uint256 lpDeposit = 500_000e6; // 500k mAED
        mockDirham.approve(address(vault), lpDeposit);
        vault.deposit(lpDeposit);
        console.log("Deposited %s mAED to vault", lpDeposit);

        // --- Execute test buy (3672.5 mAED ≈ $1000 of gold) ---
        uint256 buyAmount = 3672_500000;
        mockDirham.approve(address(engine), buyAmount);
        uint256 tokensReceived = engine.buy(AssetIds.GOLD, buyAmount);
        console.log("Bought xGOLD, tokens received:", tokensReceived);

        vm.stopBroadcast();

        console.log("\n=== Seed data complete ===");
        console.log("Vault total assets:", vault.totalAssets());
        console.log("Vault utilization: ", vault.utilization());
    }
}
