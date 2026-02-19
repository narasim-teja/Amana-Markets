// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/CoreTestSetup.sol";
import {PriceLib} from "../../src/libraries/PriceLib.sol";

contract E2ETest is CoreTestSetup {
    /// @notice Full flow: LP deposits → trader buys → trader sells → LP withdraws
    function test_full_flow_deposit_buy_sell_withdraw() public {
        // --- LP2 deposits ---
        uint256 lp2Deposit = 100_000e6;
        vm.startPrank(lp2);
        mockDirham.approve(address(liquidityVault), lp2Deposit);
        liquidityVault.deposit(lp2Deposit);
        vm.stopPrank();

        uint256 totalVaultBefore = liquidityVault.totalAssets();

        // --- Trader1 buys gold ---
        uint256 buyAmount = 10_000e6; // 10k mAED
        vm.prank(trader1);
        uint256 goldReceived = tradingEngine.buy(AssetIds.GOLD, buyAmount);
        assertTrue(goldReceived > 0);

        // Vault should have received the mAED
        assertEq(liquidityVault.totalAssets(), totalVaultBefore + buyAmount);

        // --- Trader1 sells gold ---
        vm.prank(trader1);
        uint256 stablecoinBack = tradingEngine.sell(AssetIds.GOLD, goldReceived);

        // Should get less than spent (buy spread + sell spread)
        assertTrue(stablecoinBack < buyAmount, "Should lose to spread");
        // But should get most back (spread is only ~0.30%)
        assertTrue(stablecoinBack > (buyAmount * 99) / 100, "Spread loss should be small");

        // Trader has no gold left
        assertEq(goldToken.balanceOf(trader1), 0);

        // --- LP2 withdraws ---
        uint256 lp2Shares = liquidityVault.lpShares(lp2);
        vm.prank(lp2);
        uint256 withdrawn = liquidityVault.withdraw(lp2Shares);

        // LP2 should get slightly more than deposited (earned from spread)
        assertTrue(withdrawn >= lp2Deposit, "LP should profit from spread");
    }

    /// @notice Multiple assets traded concurrently
    function test_multiple_assets_concurrent() public {
        vm.startPrank(trader1);
        uint256 goldTokens = tradingEngine.buy(AssetIds.GOLD, 5000e6);
        uint256 silverTokens = tradingEngine.buy(AssetIds.SILVER, 3000e6);
        uint256 oilTokens = tradingEngine.buy(AssetIds.OIL, 2000e6);
        vm.stopPrank();

        // All positions should exist
        (uint256 gTokens,,,) = tradingEngine.getPosition(trader1, AssetIds.GOLD);
        (uint256 sTokens,,,) = tradingEngine.getPosition(trader1, AssetIds.SILVER);
        (uint256 oTokens,,,) = tradingEngine.getPosition(trader1, AssetIds.OIL);

        assertEq(gTokens, goldTokens);
        assertEq(sTokens, silverTokens);
        assertEq(oTokens, oilTokens);

        // Exposure should be tracked per asset
        assertTrue(liquidityVault.assetExposure(AssetIds.GOLD) > 0);
        assertTrue(liquidityVault.assetExposure(AssetIds.SILVER) > 0);
        assertTrue(liquidityVault.assetExposure(AssetIds.OIL) > 0);
        assertEq(
            liquidityVault.totalExposure(),
            liquidityVault.assetExposure(AssetIds.GOLD) + liquidityVault.assetExposure(AssetIds.SILVER)
                + liquidityVault.assetExposure(AssetIds.OIL)
        );
    }

    /// @notice Vault PnL after price increase (vault loses on the round-trip)
    function test_vault_pnl_after_price_increase() public {
        uint256 vaultBalanceBefore = liquidityVault.totalAssets(); // 500k (LP only)

        // Trader buys gold at $2650
        uint256 buyAmount = 10_000e6;
        vm.prank(trader1);
        uint256 goldReceived = tradingEngine.buy(AssetIds.GOLD, buyAmount);

        // Price rises to $2750 (+~3.8%)
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 275000000000, block.timestamp + 1);
        vm.warp(block.timestamp + 1);

        // Trader sells at the higher price
        vm.prank(trader1);
        uint256 sellProceeds = tradingEngine.sell(AssetIds.GOLD, goldReceived);

        // Trader profits: sell proceeds > buy cost (price rose ~3.8%, spread ~0.6%)
        assertTrue(sellProceeds > buyAmount, "Trader should profit when price rises");

        // After full round-trip, vault has LESS than before trading
        uint256 vaultBalanceAfter = liquidityVault.totalAssets();
        assertTrue(vaultBalanceAfter < vaultBalanceBefore, "Vault should lose when price rises");
    }

    /// @notice Vault PnL after price decrease (vault profits on the round-trip)
    function test_vault_pnl_after_price_decrease() public {
        uint256 vaultBalanceBefore = liquidityVault.totalAssets(); // 500k

        // Trader buys gold at $2650
        uint256 buyAmount = 10_000e6;
        vm.prank(trader1);
        uint256 goldReceived = tradingEngine.buy(AssetIds.GOLD, buyAmount);

        // Price drops to $2550 (~-3.8%)
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 255000000000, block.timestamp + 1);
        vm.warp(block.timestamp + 1);

        // Trader sells at lower price
        vm.prank(trader1);
        uint256 sellProceeds = tradingEngine.sell(AssetIds.GOLD, goldReceived);

        // Trader loses
        assertTrue(sellProceeds < buyAmount, "Trader should lose when price drops");

        // After full round-trip, vault has MORE than before (kept the difference)
        uint256 vaultBalanceAfter = liquidityVault.totalAssets();
        assertTrue(vaultBalanceAfter > vaultBalanceBefore, "Vault should profit when price drops");
    }

    /// @notice FX rate switch mid-flow
    function test_fx_rate_switch_mid_flow() public {
        // Buy in AED mode (default 3.6725)
        uint256 aedAmount = 3672_500000; // 3672.5 mAED ≈ $1000
        vm.prank(trader1);
        uint256 tokensAed = tradingEngine.buy(AssetIds.GOLD, aedAmount);

        // Switch to USD mode
        vm.prank(admin);
        tradingEngine.setFxRate(100000000); // 1.0

        // Now 1 mAED = $1. Same dollar value should give same tokens.
        uint256 usdAmount = 1000e6; // 1000 mAED = $1000 in USD mode
        vm.prank(trader2);
        uint256 tokensUsd = tradingEngine.buy(AssetIds.GOLD, usdAmount);

        // Both represent ~$1000 worth of gold, should get approximately same tokens
        // (slight difference due to utilization-based spread change between trades)
        assertApproxEqRel(tokensAed, tokensUsd, 0.02e18); // 2% tolerance
    }

    /// @notice Two traders, multiple trades, verify fee accumulation
    function test_fee_accumulation() public {
        vm.prank(trader1);
        tradingEngine.buy(AssetIds.GOLD, 5000e6);

        vm.prank(trader2);
        tradingEngine.buy(AssetIds.SILVER, 3000e6);

        vm.prank(trader1);
        tradingEngine.buy(AssetIds.OIL, 2000e6);

        assertEq(tradingEngine.totalTradeCount(), 3);
        assertTrue(tradingEngine.totalFeesCollected() > 0);
        assertTrue(tradingEngine.feesPerAsset(AssetIds.GOLD) > 0);
        assertTrue(tradingEngine.feesPerAsset(AssetIds.SILVER) > 0);
        assertTrue(tradingEngine.feesPerAsset(AssetIds.OIL) > 0);
    }
}
