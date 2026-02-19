// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/CoreTestSetup.sol";
import {PriceLib} from "../../src/libraries/PriceLib.sol";

contract TradingEngineTest is CoreTestSetup {
    // --- FX Rate Constants ---
    uint256 constant AED_PER_USD = 367250000; // 3.6725 AED/USD (8 dec)
    uint256 constant USD_MODE = 100000000; // 1.0 (8 dec)

    function test_buy_gold_basic() public {
        uint256 spendAmount = 3672_500000; // 3672.5 mAED ≈ $1000

        vm.prank(trader1);
        uint256 tokensReceived = tradingEngine.buy(AssetIds.GOLD, spendAmount);

        assertTrue(tokensReceived > 0);
        assertEq(goldToken.balanceOf(trader1), tokensReceived);
        assertEq(mockDirham.balanceOf(address(liquidityVault)), INITIAL_LP_DEPOSIT + spendAmount);
    }

    function test_sell_gold_basic() public {
        uint256 spendAmount = 3672_500000; // ~$1000 in mAED

        // Buy first
        vm.prank(trader1);
        uint256 tokensBought = tradingEngine.buy(AssetIds.GOLD, spendAmount);

        // Sell all
        vm.prank(trader1);
        uint256 stablecoinReceived = tradingEngine.sell(AssetIds.GOLD, tokensBought);

        assertTrue(stablecoinReceived > 0);
        // Should get less than spent due to buy+sell spread
        assertTrue(stablecoinReceived < spendAmount);
        assertEq(goldToken.balanceOf(trader1), 0);
    }

    function test_buy_reverts_when_paused() public {
        vm.prank(admin);
        tradingEngine.pause();

        vm.prank(trader1);
        vm.expectRevert();
        tradingEngine.buy(AssetIds.GOLD, 1000e6);
    }

    function test_buy_reverts_zero_amount() public {
        vm.prank(trader1);
        vm.expectRevert(TradingEngine.ZeroAmount.selector);
        tradingEngine.buy(AssetIds.GOLD, 0);
    }

    function test_buy_reverts_inactive_asset() public {
        vm.prank(admin);
        assetRegistry.pauseAsset(AssetIds.GOLD);

        vm.prank(trader1);
        vm.expectRevert(abi.encodeWithSelector(TradingEngine.AssetNotActive.selector, AssetIds.GOLD));
        tradingEngine.buy(AssetIds.GOLD, 1000e6);
    }

    function test_buy_reverts_stale_oracle() public {
        // Warp past staleness threshold (default 120s)
        vm.warp(block.timestamp + 200);

        vm.prank(trader1);
        vm.expectRevert(); // AllSourcesStale from OracleRouter
        tradingEngine.buy(AssetIds.GOLD, 1000e6);
    }

    function test_sell_reverts_insufficient_liquidity() public {
        // Buy some gold
        vm.prank(trader1);
        uint256 tokensBought = tradingEngine.buy(AssetIds.GOLD, 1000e6);

        // Drain vault by pranking as TradingEngine and calling transferOut
        uint256 vaultBalance = mockDirham.balanceOf(address(liquidityVault));
        vm.prank(address(tradingEngine));
        liquidityVault.transferOut(address(1), vaultBalance - 1); // leave 1 wei

        // Try to sell — vault doesn't have enough stablecoin
        vm.prank(trader1);
        vm.expectRevert(TradingEngine.InsufficientLiquidity.selector);
        tradingEngine.sell(AssetIds.GOLD, tokensBought);
    }

    function test_spread_increases_with_utilization() public {
        uint256 spreadBefore = tradingEngine.currentSpread(AssetIds.GOLD);

        // Create significant utilization by buying a lot
        uint256 bigTrade = 20_000e6;
        vm.prank(trader1);
        tradingEngine.buy(AssetIds.GOLD, bigTrade);

        uint256 spreadAfter = tradingEngine.currentSpread(AssetIds.GOLD);
        assertTrue(spreadAfter >= spreadBefore, "Spread should increase with utilization");
    }

    function test_quoteBuy_matches_actual() public {
        uint256 amount = 5000e6;

        (uint256 quotedTokens,,,) = tradingEngine.quoteBuy(AssetIds.GOLD, amount);

        vm.prank(trader1);
        uint256 actualTokens = tradingEngine.buy(AssetIds.GOLD, amount);

        assertEq(quotedTokens, actualTokens, "Quote should match actual");
    }

    function test_quoteSell_matches_actual() public {
        // Buy first
        vm.prank(trader1);
        uint256 tokensBought = tradingEngine.buy(AssetIds.GOLD, 5000e6);

        (uint256 quotedStablecoin,,,) = tradingEngine.quoteSell(AssetIds.GOLD, tokensBought);

        vm.prank(trader1);
        uint256 actualStablecoin = tradingEngine.sell(AssetIds.GOLD, tokensBought);

        assertEq(quotedStablecoin, actualStablecoin, "Quote should match actual");
    }

    function test_position_tracking() public {
        uint256 amount = 5000e6;

        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, amount);

        (uint256 posTokens, uint256 costBasis,,) = tradingEngine.getPosition(trader1, AssetIds.GOLD);
        assertEq(posTokens, tokens);
        assertEq(costBasis, amount);
    }

    function test_position_tracking_after_partial_sell() public {
        uint256 buyAmount = 10_000e6;

        vm.prank(trader1);
        uint256 tokensBought = tradingEngine.buy(AssetIds.GOLD, buyAmount);

        // Sell half
        uint256 sellAmount = tokensBought / 2;
        vm.prank(trader1);
        tradingEngine.sell(AssetIds.GOLD, sellAmount);

        (uint256 posTokens, uint256 costBasis,,) = tradingEngine.getPosition(trader1, AssetIds.GOLD);
        assertEq(posTokens, tokensBought - sellAmount);
        // Cost basis should be roughly halved
        assertApproxEqRel(costBasis, buyAmount / 2, 0.01e18); // 1% tolerance
    }

    function test_fee_tracking() public {
        vm.prank(trader1);
        tradingEngine.buy(AssetIds.GOLD, 5000e6);

        assertTrue(tradingEngine.totalFeesCollected() > 0);
        assertTrue(tradingEngine.feesPerAsset(AssetIds.GOLD) > 0);
        assertEq(tradingEngine.totalTradeCount(), 1);
    }

    function test_setFxRate_to_usd_mode() public {
        // Switch to USD mode
        vm.prank(admin);
        tradingEngine.setFxRate(USD_MODE);

        assertEq(tradingEngine.stablecoinPerUsd(), USD_MODE);

        // Buy with 1000 "mAED" (now = $1000)
        uint256 amount = 1000e6;
        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, amount);
        assertTrue(tokens > 0);
    }

    function test_setFxRate_reverts_zero() public {
        vm.prank(admin);
        vm.expectRevert(TradingEngine.ZeroFxRate.selector);
        tradingEngine.setFxRate(0);
    }

    function test_buy_multiple_assets() public {
        vm.startPrank(trader1);
        uint256 goldTokens = tradingEngine.buy(AssetIds.GOLD, 5000e6);
        uint256 silverTokens = tradingEngine.buy(AssetIds.SILVER, 3000e6);
        uint256 oilTokens = tradingEngine.buy(AssetIds.OIL, 2000e6);
        vm.stopPrank();

        assertTrue(goldTokens > 0);
        assertTrue(silverTokens > 0);
        assertTrue(oilTokens > 0);
        assertEq(tradingEngine.totalTradeCount(), 3);
    }

    function test_large_amount_precision() public {
        // Deposit more liquidity so the trade doesn't exceed risk limits
        mockDirham.mint(lp2, 5_000_000e6);
        vm.startPrank(lp2);
        mockDirham.approve(address(liquidityVault), 5_000_000e6);
        liquidityVault.deposit(5_000_000e6);
        vm.stopPrank();

        // Mint a large amount for trader1
        mockDirham.mint(trader1, 1_000_000e6);
        vm.prank(trader1);
        mockDirham.approve(address(tradingEngine), type(uint256).max);

        // Big buy: ~$10k worth of gold in AED (within 5% single trade limit of 5.5M vault)
        uint256 bigAmount = 36_725e6; // 36,725 mAED ≈ $10k
        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, bigAmount);

        // At $2650/oz with 3.6725 AED/USD: ~$10k / $2650 ≈ 3.77 oz
        // With spread it should be slightly less
        assertTrue(tokens > 3.7e18, "Should get ~3.7+ tokens");
        assertTrue(tokens < 3.8e18, "Should get less than 3.8 tokens");
    }

    function test_small_amount_precision() public {
        // Small buy: ~$10 worth in AED
        uint256 smallAmount = 36_725000; // 36.725 mAED ≈ $10

        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, smallAmount);

        // $10 / $2650 ≈ 0.00377 oz
        assertTrue(tokens > 0, "Should get some tokens even for small amount");
        assertTrue(tokens > 3e15, "Should get ~0.003+ tokens");
    }
}
