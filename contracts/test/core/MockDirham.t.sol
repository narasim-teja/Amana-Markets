// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {MockDirham} from "../../src/tokens/MockDirham.sol";

contract MockDirhamTest is Test {
    MockDirham public token;
    address public user = makeAddr("user");

    function setUp() public {
        token = new MockDirham();
    }

    function test_name() public view {
        assertEq(token.name(), "Mock Dirham");
    }

    function test_symbol() public view {
        assertEq(token.symbol(), "mAED");
    }

    function test_decimals() public view {
        assertEq(token.decimals(), 6);
    }

    function test_mint() public {
        token.mint(user, 1000e6);
        assertEq(token.balanceOf(user), 1000e6);
    }

    function test_mint_anyone_can_call() public {
        vm.prank(user);
        token.mint(user, 500e6);
        assertEq(token.balanceOf(user), 500e6);
    }

    function test_transfer() public {
        address receiver = makeAddr("receiver");
        token.mint(user, 1000e6);

        vm.prank(user);
        token.transfer(receiver, 400e6);

        assertEq(token.balanceOf(user), 600e6);
        assertEq(token.balanceOf(receiver), 400e6);
    }
}
