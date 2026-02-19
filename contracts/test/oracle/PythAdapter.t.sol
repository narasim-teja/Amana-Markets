// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/TestSetup.sol";
import {BaseOracleAdapter} from "../../src/oracle/adapters/BaseOracleAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PythAdapterTest is TestSetup {
    // ===================== updatePrice =====================

    function test_updatePrice_success() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        IOracleAdapter.PriceData memory data = pythAdapter.getPrice(AssetIds.GOLD);
        assertEq(data.price, GOLD_PRICE);
        assertEq(data.timestamp, block.timestamp);
        assertEq(data.decimals, 8);
    }

    function test_updatePrice_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit BaseOracleAdapter.PriceUpdated(AssetIds.GOLD, GOLD_PRICE, block.timestamp, "Pyth");

        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
    }

    function test_updatePrice_revert_unauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(BaseOracleAdapter.Unauthorized.selector);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
    }

    function test_updatePrice_revert_zeroPrice() public {
        vm.prank(relayer1);
        vm.expectRevert(BaseOracleAdapter.ZeroPrice.selector);
        pythAdapter.updatePrice(AssetIds.GOLD, 0, block.timestamp);
    }

    function test_updatePrice_revert_staleTimestamp() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, 1000);

        vm.prank(relayer1);
        vm.expectRevert(abi.encodeWithSelector(BaseOracleAdapter.StaleTimestamp.selector, 999, 1000));
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, 999);
    }

    function test_updatePrice_revert_sameTimestamp() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, 1000);

        vm.prank(relayer1);
        vm.expectRevert(abi.encodeWithSelector(BaseOracleAdapter.StaleTimestamp.selector, 1000, 1000));
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, 1000);
    }

    // ===================== Relayer management =====================

    function test_addRelayer_onlyOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        pythAdapter.addRelayer(relayer2);
    }

    function test_addRelayer_success() public {
        vm.prank(admin);
        pythAdapter.addRelayer(relayer2);

        // relayer2 should now be able to push prices
        vm.prank(relayer2);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        IOracleAdapter.PriceData memory data = pythAdapter.getPrice(AssetIds.GOLD);
        assertEq(data.price, GOLD_PRICE);
    }

    function test_removeRelayer() public {
        vm.prank(admin);
        pythAdapter.removeRelayer(relayer1);

        vm.prank(relayer1);
        vm.expectRevert(BaseOracleAdapter.Unauthorized.selector);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
    }

    // ===================== isStale =====================

    function test_isStale_neverSet() public view {
        bool stale = pythAdapter.isStale(AssetIds.GOLD, 120);
        assertTrue(stale);
    }

    function test_isStale_fresh() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        bool stale = pythAdapter.isStale(AssetIds.GOLD, 120);
        assertFalse(stale);
    }

    function test_isStale_expired() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.warp(block.timestamp + 200);

        bool stale = pythAdapter.isStale(AssetIds.GOLD, 120);
        assertTrue(stale);
    }

    // ===================== getSourceName =====================

    function test_getSourceName_allAdapters() public view {
        assertEq(pythAdapter.getSourceName(), "Pyth");
        assertEq(diaAdapter.getSourceName(), "DIA");
        assertEq(redStoneAdapter.getSourceName(), "RedStone");
        assertEq(manualAdapter.getSourceName(), "Manual");
    }

    // ===================== ManualOracleAdapter auth =====================

    function test_manualAdapter_onlyOwner() public {
        // Owner can update
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        IOracleAdapter.PriceData memory data = manualAdapter.getPrice(AssetIds.GOLD);
        assertEq(data.price, GOLD_PRICE);

        // Relayer cannot update manual adapter
        vm.prank(relayer1);
        vm.expectRevert(BaseOracleAdapter.Unauthorized.selector);
        manualAdapter.updatePrice(AssetIds.SILVER, SILVER_PRICE, block.timestamp);
    }

    // ===================== Ownable2Step =====================

    function test_ownable2Step_transfer() public {
        address newOwner = makeAddr("newOwner");

        vm.prank(admin);
        pythAdapter.transferOwnership(newOwner);

        // Still owned by admin until accepted
        assertEq(pythAdapter.owner(), admin);

        vm.prank(newOwner);
        pythAdapter.acceptOwnership();

        assertEq(pythAdapter.owner(), newOwner);

        // Old owner can no longer add relayers
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, admin));
        pythAdapter.addRelayer(relayer2);
    }
}
