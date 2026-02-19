// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/CoreTestSetup.sol";

contract LiquidityVaultTest is CoreTestSetup {
    function test_deposit_first_lp_1_to_1() public view {
        // LP1 deposited INITIAL_LP_DEPOSIT in setUp
        assertEq(liquidityVault.lpShares(lp1), INITIAL_LP_DEPOSIT);
        assertEq(liquidityVault.totalShares(), INITIAL_LP_DEPOSIT);
        assertEq(liquidityVault.totalAssets(), INITIAL_LP_DEPOSIT);
    }

    function test_deposit_second_lp_proportional() public {
        uint256 depositAmount = 250_000e6;

        vm.startPrank(lp2);
        mockDirham.approve(address(liquidityVault), depositAmount);
        uint256 shares = liquidityVault.deposit(depositAmount);
        vm.stopPrank();

        // Second deposit should also be 1:1 when vault hasn't earned/lost
        assertEq(shares, depositAmount);
        assertEq(liquidityVault.lpShares(lp2), depositAmount);
        assertEq(liquidityVault.totalShares(), INITIAL_LP_DEPOSIT + depositAmount);
    }

    function test_withdraw() public {
        uint256 sharesToWithdraw = INITIAL_LP_DEPOSIT / 2;

        uint256 balanceBefore = mockDirham.balanceOf(lp1);

        vm.prank(lp1);
        uint256 amount = liquidityVault.withdraw(sharesToWithdraw);

        assertEq(amount, sharesToWithdraw); // 1:1 since no profit/loss
        assertEq(mockDirham.balanceOf(lp1), balanceBefore + amount);
        assertEq(liquidityVault.lpShares(lp1), INITIAL_LP_DEPOSIT - sharesToWithdraw);
    }

    function test_withdraw_reverts_insufficient_shares() public {
        vm.prank(lp2); // lp2 has no shares
        vm.expectRevert(
            abi.encodeWithSelector(LiquidityVault.InsufficientShares.selector, 1000e6, 0)
        );
        liquidityVault.withdraw(1000e6);
    }

    function test_deposit_reverts_zero() public {
        vm.prank(lp1);
        vm.expectRevert(LiquidityVault.ZeroAmount.selector);
        liquidityVault.deposit(0);
    }

    function test_utilization_starts_at_zero() public view {
        assertEq(liquidityVault.utilization(), 0);
    }

    function test_canAcceptTrade() public view {
        // 500k mAED in vault, 40% max exposure = 200k, 5% single trade = 25k
        assertTrue(liquidityVault.canAcceptTrade(AssetIds.GOLD, 20_000e6, 4000, 500));
    }

    function test_canAcceptTrade_fails_utilization_limit() public view {
        // Try to trade more than 80% utilization (400k of 500k)
        assertFalse(liquidityVault.canAcceptTrade(AssetIds.GOLD, 401_000e6, 10000, 10000));
    }

    function test_canAcceptTrade_fails_asset_limit() public view {
        // 500k * 4000/10000 = 200k max per asset. Try 201k.
        assertFalse(liquidityVault.canAcceptTrade(AssetIds.GOLD, 201_000e6, 4000, 10000));
    }

    function test_canAcceptTrade_fails_single_trade_limit() public view {
        // 500k * 500/10000 = 25k max single trade. Try 26k.
        assertFalse(liquidityVault.canAcceptTrade(AssetIds.GOLD, 26_000e6, 10000, 500));
    }

    function test_recordBuy_onlyTradingEngine() public {
        vm.prank(unauthorized);
        vm.expectRevert(LiquidityVault.OnlyTradingEngine.selector);
        liquidityVault.recordBuy(AssetIds.GOLD, 1000e6);
    }

    function test_recordSell_onlyTradingEngine() public {
        vm.prank(unauthorized);
        vm.expectRevert(LiquidityVault.OnlyTradingEngine.selector);
        liquidityVault.recordSell(AssetIds.GOLD, 1000e6);
    }

    function test_transferOut_onlyTradingEngine() public {
        vm.prank(unauthorized);
        vm.expectRevert(LiquidityVault.OnlyTradingEngine.selector);
        liquidityVault.transferOut(unauthorized, 1000e6);
    }

    function test_setMaxUtilization() public {
        vm.prank(admin);
        liquidityVault.setMaxUtilization(9000);
        assertEq(liquidityVault.maxUtilizationBps(), 9000);
    }

    function test_setMaxUtilization_reverts_invalid() public {
        vm.prank(admin);
        vm.expectRevert(LiquidityVault.InvalidUtilization.selector);
        liquidityVault.setMaxUtilization(0);
    }
}
