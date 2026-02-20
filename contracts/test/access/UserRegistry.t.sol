// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {UserRegistry} from "../../src/access/UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry public registry;
    address public admin = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public user3 = makeAddr("user3");
    address public unauthorized = makeAddr("unauthorized");

    function setUp() public {
        vm.prank(admin);
        registry = new UserRegistry(admin);
    }

    function test_whitelistUser() public {
        vm.prank(admin);
        registry.whitelistUser(user1);
        assertTrue(registry.isWhitelisted(user1));
        assertEq(registry.whitelistedCount(), 1);
    }

    function test_whitelistUsers_batch() public {
        address[] memory users = new address[](3);
        users[0] = user1;
        users[1] = user2;
        users[2] = user3;

        vm.prank(admin);
        registry.whitelistUsers(users);

        assertTrue(registry.isWhitelisted(user1));
        assertTrue(registry.isWhitelisted(user2));
        assertTrue(registry.isWhitelisted(user3));
        assertEq(registry.whitelistedCount(), 3);
    }

    function test_blacklistUser() public {
        vm.startPrank(admin);
        registry.whitelistUser(user1);
        assertEq(registry.whitelistedCount(), 1);

        registry.blacklistUser(user1);
        vm.stopPrank();

        assertFalse(registry.isWhitelisted(user1));
        assertTrue(registry.isBlacklisted(user1));
        assertEq(registry.whitelistedCount(), 0);
    }

    function test_removeUser() public {
        vm.startPrank(admin);
        registry.whitelistUser(user1);
        registry.removeUser(user1);
        vm.stopPrank();

        assertFalse(registry.isWhitelisted(user1));
        assertFalse(registry.isBlacklisted(user1));
        assertEq(uint256(registry.userStatus(user1)), uint256(UserRegistry.UserStatus.UNKNOWN));
        assertEq(registry.whitelistedCount(), 0);
    }

    function test_whitelistedCount_no_double_increment() public {
        vm.startPrank(admin);
        registry.whitelistUser(user1);
        registry.whitelistUser(user1); // already whitelisted
        vm.stopPrank();

        assertEq(registry.whitelistedCount(), 1);
    }

    function test_onlyOwner_whitelist() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.whitelistUser(user1);
    }

    function test_onlyOwner_blacklist() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.blacklistUser(user1);
    }

    function test_reverts_zero_address_whitelist() public {
        vm.prank(admin);
        vm.expectRevert(UserRegistry.ZeroAddress.selector);
        registry.whitelistUser(address(0));
    }

    function test_reverts_zero_address_blacklist() public {
        vm.prank(admin);
        vm.expectRevert(UserRegistry.ZeroAddress.selector);
        registry.blacklistUser(address(0));
    }

    function test_isWhitelisted_default_false() public view {
        assertFalse(registry.isWhitelisted(user1));
    }

    function test_isBlacklisted_default_false() public view {
        assertFalse(registry.isBlacklisted(user1));
    }
}
