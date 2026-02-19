// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/TestSetup.sol";
import {OracleRouter} from "../../src/oracle/OracleRouter.sol";
import {PythAdapter} from "../../src/oracle/adapters/PythAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract OracleRouterTest is TestSetup {
    // ===================== Adapter management =====================

    function test_addAdapter() public view {
        // Setup already added 4 adapters, verify them
        address[] memory registered = router.getAdapters();
        assertEq(registered.length, 4);
        assertTrue(router.isActiveAdapter(address(pythAdapter)));
        assertTrue(router.isActiveAdapter(address(diaAdapter)));
        assertTrue(router.isActiveAdapter(address(redStoneAdapter)));
        assertTrue(router.isActiveAdapter(address(manualAdapter)));
    }

    function test_addAdapter_emitsEvent() public {
        PythAdapter newAdapter = new PythAdapter(admin);

        vm.expectEmit(true, false, false, true);
        emit OracleRouter.AdapterAdded(address(newAdapter), "Pyth");

        vm.prank(admin);
        router.addAdapter(address(newAdapter));
    }

    function test_addAdapter_revert_duplicate() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(OracleRouter.AdapterAlreadyRegistered.selector, address(pythAdapter))
        );
        router.addAdapter(address(pythAdapter));
    }

    function test_addAdapter_revert_notOwner() public {
        PythAdapter newAdapter = new PythAdapter(admin);
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        router.addAdapter(address(newAdapter));
    }

    function test_removeAdapter() public {
        vm.prank(admin);
        router.removeAdapter(address(diaAdapter));

        assertFalse(router.isActiveAdapter(address(diaAdapter)));
        address[] memory registered = router.getAdapters();
        assertEq(registered.length, 3);
    }

    function test_removeAdapter_revert_notRegistered() public {
        address fake = makeAddr("fake");
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(OracleRouter.AdapterNotRegistered.selector, fake));
        router.removeAdapter(fake);
    }

    // ===================== getAllPrices =====================

    function test_getAllPrices_multipleAdapters() public {
        // Push prices from 3 relayed adapters + manual
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 265000000000, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 265100000000, block.timestamp);
        vm.prank(relayer1);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 264900000000, block.timestamp);
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 265050000000, block.timestamp);

        (address[] memory sources, IOracleAdapter.PriceData[] memory prices, uint256 freshCount) =
            router.getAllPrices(AssetIds.GOLD);

        assertEq(sources.length, 4);
        assertEq(freshCount, 4);
        assertEq(prices[0].price, 265000000000); // Pyth
        assertEq(prices[1].price, 265100000000); // DIA
        assertEq(prices[2].price, 264900000000); // RedStone
        assertEq(prices[3].price, 265050000000); // Manual
    }

    function test_getAllPrices_countsFreshCorrectly() public {
        // Push to 2 adapters, leave others empty
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        (, , uint256 freshCount) = router.getAllPrices(AssetIds.GOLD);
        assertEq(freshCount, 2); // Only 2 have data; DIA and RedStone return timestamp=0 (stale)
    }

    // ===================== getFreshestPrice =====================

    function test_getFreshestPrice() public {
        // Push prices at different timestamps
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 265000000000, block.timestamp);

        vm.warp(block.timestamp + 10);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 265100000000, block.timestamp);

        vm.warp(block.timestamp + 10);
        vm.prank(relayer1);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 264900000000, block.timestamp);

        (IOracleAdapter.PriceData memory price, address source) = router.getFreshestPrice(AssetIds.GOLD);

        assertEq(source, address(redStoneAdapter));
        assertEq(price.price, 264900000000);
    }

    function test_getFreshestPrice_revert_allStale() public {
        // Push a price then warp past staleness
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.warp(block.timestamp + 200); // Beyond 120s default staleness

        vm.expectRevert(OracleRouter.AllSourcesStale.selector);
        router.getFreshestPrice(AssetIds.GOLD);
    }

    function test_getFreshestPrice_revert_noPrices() public {
        // No prices pushed at all
        vm.expectRevert(OracleRouter.AllSourcesStale.selector);
        router.getFreshestPrice(AssetIds.GOLD);
    }

    // ===================== getMedianPrice =====================

    function test_getMedianPrice_oddSources() public {
        // Push 3 prices
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 100, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 300, block.timestamp);
        vm.prank(relayer1);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 200, block.timestamp);

        (uint256 median, uint256 count) = router.getMedianPrice(AssetIds.GOLD);
        assertEq(median, 200); // Sorted: [100, 200, 300] → median = 200
        assertEq(count, 3);
    }

    function test_getMedianPrice_evenSources() public {
        // Push 2 prices
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 100, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 200, block.timestamp);

        (uint256 median, uint256 count) = router.getMedianPrice(AssetIds.GOLD);
        assertEq(median, 150); // Average of 100 and 200
        assertEq(count, 2);
    }

    function test_getMedianPrice_fourSources() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 100, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 400, block.timestamp);
        vm.prank(relayer1);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 200, block.timestamp);
        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 300, block.timestamp);

        (uint256 median, uint256 count) = router.getMedianPrice(AssetIds.GOLD);
        // Sorted: [100, 200, 300, 400] → median = (200+300)/2 = 250
        assertEq(median, 250);
        assertEq(count, 4);
    }

    function test_getMedianPrice_revert_insufficientSources() public {
        vm.prank(admin);
        router.setMinimumSources(3);

        // Only push to 2 adapters
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.expectRevert(abi.encodeWithSelector(OracleRouter.InsufficientSources.selector, 2, 3));
        router.getMedianPrice(AssetIds.GOLD);
    }

    function test_getMedianPrice_excludesStalePrices() public {
        // Push to all 3 relayed adapters
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 100, block.timestamp);
        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.GOLD, 200, block.timestamp);
        vm.prank(relayer1);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 300, block.timestamp);

        // Warp so all are stale, then refresh only Pyth
        vm.warp(block.timestamp + 200);
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 500, block.timestamp);

        (uint256 median, uint256 count) = router.getMedianPrice(AssetIds.GOLD);
        assertEq(count, 1); // Only Pyth is fresh
        assertEq(median, 500);
    }

    // ===================== hasSufficientData =====================

    function test_hasSufficientData_true() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        assertTrue(router.hasSufficientData(AssetIds.GOLD));
    }

    function test_hasSufficientData_false_noData() public view {
        assertFalse(router.hasSufficientData(AssetIds.GOLD));
    }

    function test_hasSufficientData_false_allStale() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.warp(block.timestamp + 200);
        assertFalse(router.hasSufficientData(AssetIds.GOLD));
    }

    // ===================== Staleness config =====================

    function test_setStaleness_perAsset() public {
        vm.prank(admin);
        router.setMaxStaleness(AssetIds.GOLD, 60);

        // Push gold price, warp 90 seconds
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.SILVER, SILVER_PRICE, block.timestamp);

        vm.warp(block.timestamp + 90);

        // Gold should be stale (60s max), but silver uses default 120s (still fresh)
        vm.expectRevert(OracleRouter.AllSourcesStale.selector);
        router.getFreshestPrice(AssetIds.GOLD);

        // Silver should still work
        (IOracleAdapter.PriceData memory price,) = router.getFreshestPrice(AssetIds.SILVER);
        assertEq(price.price, SILVER_PRICE);
    }

    function test_setDefaultStaleness() public {
        vm.prank(admin);
        router.setDefaultMaxStaleness(300);

        assertEq(router.defaultMaxStaleness(), 300);

        // Push price and warp 200s — should still be fresh with 300s window
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.warp(block.timestamp + 200);

        (IOracleAdapter.PriceData memory price,) = router.getFreshestPrice(AssetIds.GOLD);
        assertEq(price.price, GOLD_PRICE);
    }

    function test_setStaleness_revert_zero() public {
        vm.prank(admin);
        vm.expectRevert(OracleRouter.InvalidStaleness.selector);
        router.setMaxStaleness(AssetIds.GOLD, 0);

        vm.prank(admin);
        vm.expectRevert(OracleRouter.InvalidStaleness.selector);
        router.setDefaultMaxStaleness(0);
    }

    function test_setMinimumSources_revert_zero() public {
        vm.prank(admin);
        vm.expectRevert(OracleRouter.InvalidMinimumSources.selector);
        router.setMinimumSources(0);
    }

    // ===================== getPriceFromSource =====================

    function test_getPriceFromSource() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        IOracleAdapter.PriceData memory data = router.getPriceFromSource(AssetIds.GOLD, address(pythAdapter));
        assertEq(data.price, GOLD_PRICE);
        assertEq(data.decimals, 8);
    }
}
