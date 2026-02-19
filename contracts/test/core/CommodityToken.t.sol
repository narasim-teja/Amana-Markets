// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {CommodityToken} from "../../src/tokens/CommodityToken.sol";

contract CommodityTokenTest is Test {
    CommodityToken public token;
    address public minter = makeAddr("minter");
    address public user = makeAddr("user");
    address public unauthorized = makeAddr("unauthorized");

    function setUp() public {
        token = new CommodityToken("Gold", "xGOLD", minter);
    }

    function test_name_and_symbol() public view {
        assertEq(token.name(), "Gold");
        assertEq(token.symbol(), "xGOLD");
    }

    function test_decimals_is_18() public view {
        assertEq(token.decimals(), 18);
    }

    function test_minter_is_immutable() public view {
        assertEq(token.minter(), minter);
    }

    function test_constructor_reverts_zero_minter() public {
        vm.expectRevert(CommodityToken.ZeroMinter.selector);
        new CommodityToken("Gold", "xGOLD", address(0));
    }

    function test_mint_by_minter() public {
        vm.prank(minter);
        token.mint(user, 1e18);
        assertEq(token.balanceOf(user), 1e18);
    }

    function test_mint_reverts_unauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(CommodityToken.OnlyMinter.selector);
        token.mint(user, 1e18);
    }

    function test_minterBurn() public {
        vm.prank(minter);
        token.mint(user, 5e18);

        vm.prank(minter);
        token.minterBurn(user, 2e18);

        assertEq(token.balanceOf(user), 3e18);
    }

    function test_minterBurn_reverts_unauthorized() public {
        vm.prank(minter);
        token.mint(user, 5e18);

        vm.prank(unauthorized);
        vm.expectRevert(CommodityToken.OnlyMinter.selector);
        token.minterBurn(user, 2e18);
    }

    function test_transfer() public {
        address receiver = makeAddr("receiver");

        vm.prank(minter);
        token.mint(user, 10e18);

        vm.prank(user);
        token.transfer(receiver, 3e18);

        assertEq(token.balanceOf(user), 7e18);
        assertEq(token.balanceOf(receiver), 3e18);
    }

    function test_user_can_burn_own_tokens() public {
        vm.prank(minter);
        token.mint(user, 5e18);

        vm.prank(user);
        token.burn(2e18);

        assertEq(token.balanceOf(user), 3e18);
    }
}
