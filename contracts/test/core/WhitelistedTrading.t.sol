// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/CoreTestSetup.sol";
import {UserRegistry} from "../../src/access/UserRegistry.sol";

/// @notice Tests for whitelist-gated trading and LP deposits.
///         Extends CoreTestSetup (which does NOT set a UserRegistry),
///         then wires one in for whitelist enforcement.
contract WhitelistedTradingTest is CoreTestSetup {
    UserRegistry public userRegistry;
    address public blockedUser = makeAddr("blockedUser");

    function setUp() public override {
        super.setUp();

        // Deploy UserRegistry and wire it up
        vm.startPrank(admin);
        userRegistry = new UserRegistry(admin);
        tradingEngine.setUserRegistry(address(userRegistry));
        liquidityVault.setUserRegistry(address(userRegistry));

        // Whitelist the test actors used by CoreTestSetup
        userRegistry.whitelistUser(trader1);
        userRegistry.whitelistUser(trader2);
        userRegistry.whitelistUser(lp1);
        userRegistry.whitelistUser(lp2);
        vm.stopPrank();

        // Give blocked user some mAED and approval
        mockDirham.mint(blockedUser, TRADER_BALANCE);
        vm.prank(blockedUser);
        mockDirham.approve(address(tradingEngine), type(uint256).max);
    }

    // --- TradingEngine whitelist tests ---

    function test_buy_succeeds_when_whitelisted() public {
        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, 3672_500000); // ~$1000 worth
        assertGt(tokens, 0);
    }

    function test_buy_reverts_when_not_whitelisted() public {
        vm.prank(blockedUser);
        vm.expectRevert(abi.encodeWithSelector(TradingEngine.UserNotWhitelisted.selector, blockedUser));
        tradingEngine.buy(AssetIds.GOLD, 3672_500000);
    }

    function test_buy_reverts_when_blacklisted() public {
        vm.prank(admin);
        userRegistry.blacklistUser(trader1);

        vm.prank(trader1);
        vm.expectRevert(abi.encodeWithSelector(TradingEngine.UserNotWhitelisted.selector, trader1));
        tradingEngine.buy(AssetIds.GOLD, 3672_500000);
    }

    function test_sell_succeeds_when_whitelisted() public {
        // First buy some tokens
        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, 3672_500000);

        // Then sell
        vm.prank(trader1);
        uint256 received = tradingEngine.sell(AssetIds.GOLD, tokens);
        assertGt(received, 0);
    }

    function test_sell_reverts_when_not_whitelisted() public {
        // Buy while whitelisted
        vm.prank(trader1);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, 3672_500000);

        // Remove from whitelist
        vm.prank(admin);
        userRegistry.removeUser(trader1);

        // Try to sell — should revert
        vm.prank(trader1);
        vm.expectRevert(abi.encodeWithSelector(TradingEngine.UserNotWhitelisted.selector, trader1));
        tradingEngine.sell(AssetIds.GOLD, tokens);
    }

    // --- LiquidityVault whitelist tests ---

    function test_deposit_succeeds_when_whitelisted() public {
        vm.startPrank(lp2);
        mockDirham.approve(address(liquidityVault), type(uint256).max);
        uint256 shares = liquidityVault.deposit(100_000e6);
        vm.stopPrank();
        assertGt(shares, 0);
    }

    function test_deposit_reverts_when_not_whitelisted() public {
        vm.startPrank(blockedUser);
        mockDirham.approve(address(liquidityVault), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(LiquidityVault.UserNotWhitelisted.selector, blockedUser));
        liquidityVault.deposit(100_000e6);
        vm.stopPrank();
    }

    function test_withdraw_succeeds_even_when_blacklisted() public {
        // LP2 deposits while whitelisted
        vm.startPrank(lp2);
        mockDirham.approve(address(liquidityVault), type(uint256).max);
        uint256 shares = liquidityVault.deposit(100_000e6);
        vm.stopPrank();

        // Blacklist LP2
        vm.prank(admin);
        userRegistry.blacklistUser(lp2);

        // LP2 should still be able to withdraw (never trap funds)
        vm.prank(lp2);
        uint256 amount = liquidityVault.withdraw(shares);
        assertGt(amount, 0);
    }

    // --- Backward compatibility ---

    function test_trading_works_without_registry_set() public {
        // Remove user registry (set to zero address)
        vm.startPrank(admin);
        tradingEngine.setUserRegistry(address(0));
        liquidityVault.setUserRegistry(address(0));
        vm.stopPrank();

        // Anyone should be able to trade now (no whitelist enforcement)
        vm.prank(blockedUser);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, 3672_500000);
        assertGt(tokens, 0);
    }

    // --- Admin tests ---

    function test_setUserRegistry_onlyOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        tradingEngine.setUserRegistry(address(0));
    }

    function test_disable_whitelist_by_setting_zero_address() public {
        vm.prank(admin);
        tradingEngine.setUserRegistry(address(0));

        // Non-whitelisted user can now trade
        vm.prank(blockedUser);
        uint256 tokens = tradingEngine.buy(AssetIds.GOLD, 3672_500000);
        assertGt(tokens, 0);
    }
}
