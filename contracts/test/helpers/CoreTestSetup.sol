// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./TestSetup.sol";
import {MockDirham} from "../../src/tokens/MockDirham.sol";
import {CommodityToken} from "../../src/tokens/CommodityToken.sol";
import {CommodityTokenFactory} from "../../src/tokens/CommodityTokenFactory.sol";
import {AssetRegistry} from "../../src/core/AssetRegistry.sol";
import {LiquidityVault} from "../../src/core/LiquidityVault.sol";
import {TradingEngine} from "../../src/core/TradingEngine.sol";
import {AssetIds} from "../../src/libraries/AssetIds.sol";

/// @notice Extended test setup that deploys Step 1 (oracles) + Step 2 (core trading).
///         Inherits from TestSetup so existing oracle tests are unaffected.
abstract contract CoreTestSetup is TestSetup {
    // --- New Actors ---
    address public lp1 = makeAddr("lp1");
    address public lp2 = makeAddr("lp2");
    address public trader1 = makeAddr("trader1");
    address public trader2 = makeAddr("trader2");

    // --- Step 2 Contracts ---
    MockDirham public mockDirham;
    CommodityTokenFactory public tokenFactory;
    AssetRegistry public assetRegistry;
    LiquidityVault public liquidityVault;
    TradingEngine public tradingEngine;

    // --- Token References ---
    CommodityToken public goldToken;
    CommodityToken public silverToken;
    CommodityToken public oilToken;

    // --- Test Amounts ---
    uint256 public constant INITIAL_LP_DEPOSIT = 500_000e6; // 500k mAED
    uint256 public constant TRADER_BALANCE = 100_000e6; // 100k mAED

    function setUp() public virtual override {
        // Deploy oracle layer (Step 1)
        super.setUp();

        vm.startPrank(admin);

        // --- Step 2 Deployment ---

        // 1. MockDirham (mAED stablecoin)
        mockDirham = new MockDirham();

        // 2. CommodityTokenFactory
        tokenFactory = new CommodityTokenFactory(admin);

        // 3. AssetRegistry
        assetRegistry = new AssetRegistry(admin, address(tokenFactory));

        // 4. LiquidityVault
        liquidityVault = new LiquidityVault(admin, address(mockDirham));

        // 5. TradingEngine
        tradingEngine = new TradingEngine(
            admin, address(router), address(liquidityVault), address(assetRegistry), address(mockDirham)
        );

        // 6. Wire: factory authorized creator = registry
        tokenFactory.setAuthorizedCreator(address(assetRegistry));

        // 7. Wire: registry knows TradingEngine
        assetRegistry.setTradingEngine(address(tradingEngine));

        // 8. Wire: vault knows TradingEngine
        liquidityVault.setTradingEngine(address(tradingEngine));

        // 9. Add assets (deploys CommodityTokens via factory)
        assetRegistry.addAsset(AssetIds.GOLD, "Gold", "xGOLD", 30, 4000, 500);
        assetRegistry.addAsset(AssetIds.SILVER, "Silver", "xSILVER", 30, 4000, 500);
        assetRegistry.addAsset(AssetIds.OIL, "Oil", "xOIL", 50, 3000, 500);

        vm.stopPrank();

        // Resolve token addresses
        goldToken = CommodityToken(tokenFactory.getToken(AssetIds.GOLD));
        silverToken = CommodityToken(tokenFactory.getToken(AssetIds.SILVER));
        oilToken = CommodityToken(tokenFactory.getToken(AssetIds.OIL));

        // Seed oracle prices
        vm.startPrank(admin);
        manualAdapter.updatePrice(AssetIds.GOLD, GOLD_PRICE, block.timestamp);
        manualAdapter.updatePrice(AssetIds.SILVER, SILVER_PRICE, block.timestamp);
        manualAdapter.updatePrice(AssetIds.OIL, OIL_PRICE, block.timestamp);
        vm.stopPrank();

        // Mint mAED to test actors
        mockDirham.mint(lp1, INITIAL_LP_DEPOSIT * 2);
        mockDirham.mint(lp2, INITIAL_LP_DEPOSIT);
        mockDirham.mint(trader1, TRADER_BALANCE);
        mockDirham.mint(trader2, TRADER_BALANCE);

        // LP1 deposits into vault
        vm.startPrank(lp1);
        mockDirham.approve(address(liquidityVault), type(uint256).max);
        liquidityVault.deposit(INITIAL_LP_DEPOSIT);
        vm.stopPrank();

        // Traders approve TradingEngine
        vm.prank(trader1);
        mockDirham.approve(address(tradingEngine), type(uint256).max);
        vm.prank(trader2);
        mockDirham.approve(address(tradingEngine), type(uint256).max);
    }
}
