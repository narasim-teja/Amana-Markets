// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../helpers/CoreTestSetup.sol";

contract AssetRegistryTest is CoreTestSetup {
    function test_addAsset_creates_token() public view {
        address goldAddr = tokenFactory.getToken(AssetIds.GOLD);
        assertTrue(goldAddr != address(0));

        AssetRegistry.AssetConfig memory cfg = assetRegistry.getAsset(AssetIds.GOLD);
        assertEq(cfg.tokenAddress, goldAddr);
        assertEq(cfg.baseSpreadBps, 30);
        assertEq(cfg.maxExposureBps, 4000);
        assertEq(cfg.maxSingleTradeBps, 500);
        assertTrue(cfg.isActive);
        assertTrue(cfg.addedAt > 0);
    }

    function test_addAsset_sets_correct_token_name() public view {
        assertEq(goldToken.name(), "Gold");
        assertEq(goldToken.symbol(), "xGOLD");
        assertEq(silverToken.name(), "Silver");
        assertEq(silverToken.symbol(), "xSILVER");
        assertEq(oilToken.name(), "Oil");
        assertEq(oilToken.symbol(), "xOIL");
    }

    function test_addAsset_token_minter_is_tradingEngine() public view {
        assertEq(goldToken.minter(), address(tradingEngine));
        assertEq(silverToken.minter(), address(tradingEngine));
        assertEq(oilToken.minter(), address(tradingEngine));
    }

    function test_addAsset_reverts_duplicate() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssetRegistry.AssetAlreadyExists.selector, AssetIds.GOLD));
        assetRegistry.addAsset(AssetIds.GOLD, "Gold2", "xGOLD2", 30, 4000, 500);
    }

    function test_addAsset_reverts_tradingEngine_not_set() public {
        // Deploy a fresh registry without tradingEngine set
        vm.startPrank(admin);
        CommodityTokenFactory newFactory = new CommodityTokenFactory(admin);
        AssetRegistry newRegistry = new AssetRegistry(admin, address(newFactory));

        vm.expectRevert(AssetRegistry.TradingEngineNotSet.selector);
        newRegistry.addAsset(AssetIds.GOLD, "Gold", "xGOLD", 30, 4000, 500);
        vm.stopPrank();
    }

    function test_addAsset_reverts_invalid_spread() public {
        bytes32 fakeAsset = keccak256("FAKE/USD");
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssetRegistry.InvalidBps.selector, 0));
        assetRegistry.addAsset(fakeAsset, "Fake", "xFAKE", 0, 4000, 500);
    }

    function test_pauseAsset() public {
        vm.prank(admin);
        assetRegistry.pauseAsset(AssetIds.GOLD);

        assertFalse(assetRegistry.isAssetActive(AssetIds.GOLD));
    }

    function test_unpauseAsset() public {
        vm.startPrank(admin);
        assetRegistry.pauseAsset(AssetIds.GOLD);
        assetRegistry.unpauseAsset(AssetIds.GOLD);
        vm.stopPrank();

        assertTrue(assetRegistry.isAssetActive(AssetIds.GOLD));
    }

    function test_updateSpread() public {
        vm.prank(admin);
        assetRegistry.updateSpread(AssetIds.GOLD, 50);

        AssetRegistry.AssetConfig memory cfg = assetRegistry.getAsset(AssetIds.GOLD);
        assertEq(cfg.baseSpreadBps, 50);
    }

    function test_updateExposureLimits() public {
        vm.prank(admin);
        assetRegistry.updateExposureLimits(AssetIds.GOLD, 5000, 1000);

        AssetRegistry.AssetConfig memory cfg = assetRegistry.getAsset(AssetIds.GOLD);
        assertEq(cfg.maxExposureBps, 5000);
        assertEq(cfg.maxSingleTradeBps, 1000);
    }

    function test_getAllAssets() public view {
        bytes32[] memory assets = assetRegistry.getAllAssets();
        assertEq(assets.length, 3);
        assertEq(assets[0], AssetIds.GOLD);
        assertEq(assets[1], AssetIds.SILVER);
        assertEq(assets[2], AssetIds.OIL);
    }

    function test_assetCount() public view {
        assertEq(assetRegistry.assetCount(), 3);
    }

    function test_onlyOwner_addAsset() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        assetRegistry.addAsset(keccak256("TEST"), "Test", "xTEST", 30, 4000, 500);
    }

    function test_onlyOwner_pauseAsset() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        assetRegistry.pauseAsset(AssetIds.GOLD);
    }
}
