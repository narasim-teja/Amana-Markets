// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/TestSetup.sol";

contract IntegrationTest is TestSetup {
    function test_fullFlow_pushPrices_queryRouter() public {
        // Push prices to all relayed adapters
        vm.startPrank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 265000000000, block.timestamp);
        pythAdapter.updatePrice(AssetIds.SILVER, 3150000000, block.timestamp);
        pythAdapter.updatePrice(AssetIds.OIL, 7200000000, block.timestamp);

        diaAdapter.updatePrice(AssetIds.GOLD, 265100000000, block.timestamp);
        diaAdapter.updatePrice(AssetIds.SILVER, 3155000000, block.timestamp);
        diaAdapter.updatePrice(AssetIds.OIL, 7210000000, block.timestamp);

        redStoneAdapter.updatePrice(AssetIds.GOLD, 264900000000, block.timestamp);
        redStoneAdapter.updatePrice(AssetIds.SILVER, 3145000000, block.timestamp);
        redStoneAdapter.updatePrice(AssetIds.OIL, 7190000000, block.timestamp);
        vm.stopPrank();

        // Push via manual adapter
        vm.startPrank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 265050000000, block.timestamp);
        manualAdapter.updatePrice(AssetIds.SILVER, 3148000000, block.timestamp);
        manualAdapter.updatePrice(AssetIds.OIL, 7195000000, block.timestamp);
        vm.stopPrank();

        // Query router — getAllPrices
        (, IOracleAdapter.PriceData[] memory goldPrices, uint256 freshCount) =
            router.getAllPrices(AssetIds.GOLD);
        assertEq(freshCount, 4);
        assertEq(goldPrices[0].price, 265000000000);

        // Query router — getMedianPrice
        (uint256 goldMedian, uint256 goldCount) = router.getMedianPrice(AssetIds.GOLD);
        assertEq(goldCount, 4);
        // Sorted: [264900000000, 265000000000, 265050000000, 265100000000]
        // Median = (265000000000 + 265050000000) / 2 = 265025000000
        assertEq(goldMedian, 265025000000);

        // Query router — getFreshestPrice (all same timestamp, returns first found with highest)
        (IOracleAdapter.PriceData memory freshest,) = router.getFreshestPrice(AssetIds.GOLD);
        assertTrue(freshest.price > 0);

        // Verify other assets
        (uint256 silverMedian,) = router.getMedianPrice(AssetIds.SILVER);
        assertTrue(silverMedian > 0);
        (uint256 oilMedian,) = router.getMedianPrice(AssetIds.OIL);
        assertTrue(oilMedian > 0);

        // hasSufficientData
        assertTrue(router.hasSufficientData(AssetIds.GOLD));
        assertTrue(router.hasSufficientData(AssetIds.SILVER));
        assertTrue(router.hasSufficientData(AssetIds.OIL));
    }

    function test_mixedStaleFresh_prices() public {
        uint256 startTime = block.timestamp;

        // Push to all adapters at t=0
        vm.startPrank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 265000000000, startTime);
        diaAdapter.updatePrice(AssetIds.GOLD, 265100000000, startTime);
        redStoneAdapter.updatePrice(AssetIds.GOLD, 264900000000, startTime);
        vm.stopPrank();

        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, 265050000000, startTime);

        // Warp 90 seconds — all still fresh (120s default)
        vm.warp(startTime + 90);

        // Refresh only Pyth
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 266000000000, block.timestamp);

        // getFreshestPrice should return Pyth (most recent)
        (IOracleAdapter.PriceData memory freshest, address source) = router.getFreshestPrice(AssetIds.GOLD);
        assertEq(source, address(pythAdapter));
        assertEq(freshest.price, 266000000000);

        // All 4 still fresh (90s old for DIA/RedStone/Manual, 0s for Pyth)
        (, , uint256 freshCount) = router.getAllPrices(AssetIds.GOLD);
        assertEq(freshCount, 4);

        // Warp another 40 seconds (total 130s from start)
        vm.warp(startTime + 130);

        // DIA, RedStone, Manual are now stale (130s > 120s)
        // Pyth is 40s old (fresh)
        (, , freshCount) = router.getAllPrices(AssetIds.GOLD);
        assertEq(freshCount, 1); // Only Pyth

        // getFreshestPrice still returns Pyth
        (freshest, source) = router.getFreshestPrice(AssetIds.GOLD);
        assertEq(source, address(pythAdapter));
        assertEq(freshest.price, 266000000000);

        // Median with minimumSources=1 should work
        (uint256 median, uint256 count) = router.getMedianPrice(AssetIds.GOLD);
        assertEq(count, 1);
        assertEq(median, 266000000000);
    }

    function test_multipleAssets_independent() public {
        // Push different assets to different adapters
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);

        vm.prank(relayer1);
        diaAdapter.updatePrice(AssetIds.SILVER, SILVER_PRICE, block.timestamp);

        vm.prank(admin);
        manualAdapter.updatePrice(AssetIds.OIL, OIL_PRICE, block.timestamp);

        // Gold only from Pyth
        (IOracleAdapter.PriceData memory goldFreshest, address goldSource) =
            router.getFreshestPrice(AssetIds.GOLD);
        assertEq(goldSource, address(pythAdapter));
        assertEq(goldFreshest.price, GOLD_PRICE);

        // Silver only from DIA
        (IOracleAdapter.PriceData memory silverFreshest, address silverSource) =
            router.getFreshestPrice(AssetIds.SILVER);
        assertEq(silverSource, address(diaAdapter));
        assertEq(silverFreshest.price, SILVER_PRICE);

        // Oil only from Manual
        (IOracleAdapter.PriceData memory oilFreshest, address oilSource) =
            router.getFreshestPrice(AssetIds.OIL);
        assertEq(oilSource, address(manualAdapter));
        assertEq(oilFreshest.price, OIL_PRICE);

        // Cross-query: SILVER from Pyth should return empty (price=0, timestamp=0)
        IOracleAdapter.PriceData memory emptyData = router.getPriceFromSource(AssetIds.SILVER, address(pythAdapter));
        assertEq(emptyData.price, 0);
        assertEq(emptyData.timestamp, 0);
    }

    function test_priceUpdate_overwrites_correctly() public {
        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 100, 1000);

        vm.prank(relayer1);
        pythAdapter.updatePrice(AssetIds.GOLD, 200, 2000);

        IOracleAdapter.PriceData memory data = pythAdapter.getPrice(AssetIds.GOLD);
        assertEq(data.price, 200);
        assertEq(data.timestamp, 2000);
    }
}
