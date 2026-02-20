// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IOracleAdapter} from "../oracle/interfaces/IOracleAdapter.sol";
import {OracleRouter} from "../oracle/OracleRouter.sol";
import {LiquidityVault} from "./LiquidityVault.sol";
import {AssetRegistry} from "./AssetRegistry.sol";
import {CommodityToken} from "../tokens/CommodityToken.sol";
import {PriceLib} from "../libraries/PriceLib.sol";
import {UserRegistry} from "../access/UserRegistry.sol";

/// @title TradingEngine
/// @notice Main entry point for buying/selling tokenized commodities.
///         Reads USD prices from OracleRouter, converts to local stablecoin (mAED)
///         via a configurable FX rate, applies dynamic spreads, and orchestrates
///         token minting/burning + vault transfers.
contract TradingEngine is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Immutable Dependencies ---
    OracleRouter public immutable oracleRouter;
    LiquidityVault public immutable vault;
    AssetRegistry public immutable registry;
    IERC20 public immutable stablecoin;

    // --- User Registry (opt-in whitelist) ---
    UserRegistry public userRegistry;

    // --- FX Rate (USD → local stablecoin) ---
    /// @notice Stablecoin units per 1 USD, 8 decimals.
    ///         Default: 367250000 = 3.6725 AED/USD
    ///         Set to 100000000 (1e8 = 1.0) for USD-equivalent mode.
    uint256 public stablecoinPerUsd = 367250000;

    // --- Spread Configuration ---
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public spreadScalingFactor = 15000; // 1.5x scaling at 100% utilization
    uint256 public constant MAX_SPREAD_MULTIPLIER = 5;

    // --- Fee & Trade Tracking ---
    uint256 public totalFeesCollected;
    mapping(bytes32 => uint256) public feesPerAsset;
    uint256 public totalTradeCount;

    // --- Position Tracking ---
    struct Position {
        uint256 totalCostBasis; // Total stablecoin spent (6 decimals)
        uint256 totalTokens; // Total commodity tokens held via protocol (18 decimals)
    }

    mapping(address => mapping(bytes32 => Position)) public positions;

    // --- Events ---
    event TradeExecuted(
        address indexed trader,
        bytes32 indexed assetId,
        bool isBuy,
        uint256 stablecoinAmount,
        uint256 tokenAmount,
        uint256 oraclePriceUsd,
        uint256 effectivePriceLocal,
        uint256 spreadBps,
        uint256 fee,
        uint256 timestamp
    );
    event FxRateUpdated(uint256 oldRate, uint256 newRate);
    event SpreadScalingUpdated(uint256 newFactor);
    event UserRegistryUpdated(address indexed registry);

    // --- Errors ---
    error AssetNotActive(bytes32 assetId);
    error TradeLimitExceeded(bytes32 assetId, uint256 amount);
    error InsufficientLiquidity();
    error ZeroAmount();
    error ZeroFxRate();
    error UserNotWhitelisted(address user);

    modifier onlyWhitelisted() {
        if (address(userRegistry) != address(0)) {
            if (!userRegistry.isWhitelisted(msg.sender)) {
                revert UserNotWhitelisted(msg.sender);
            }
        }
        _;
    }

    constructor(
        address initialOwner,
        address oracleRouter_,
        address vault_,
        address registry_,
        address stablecoin_
    ) Ownable(initialOwner) {
        oracleRouter = OracleRouter(oracleRouter_);
        vault = LiquidityVault(vault_);
        registry = AssetRegistry(registry_);
        stablecoin = IERC20(stablecoin_);
    }

    // ========== Core Trading ==========

    /// @notice Buy commodity tokens with stablecoin (mAED)
    /// @param assetId The asset to buy (e.g., AssetIds.GOLD)
    /// @param stablecoinAmount Amount of stablecoin to spend (6 decimals)
    /// @return tokensReceived Amount of commodity tokens minted (18 decimals)
    function buy(bytes32 assetId, uint256 stablecoinAmount)
        external
        whenNotPaused
        nonReentrant
        onlyWhitelisted
        returns (uint256 tokensReceived)
    {
        if (stablecoinAmount == 0) revert ZeroAmount();

        // 1. Verify asset is active
        AssetRegistry.AssetConfig memory asset = registry.getAsset(assetId);
        if (!asset.isActive || asset.addedAt == 0) revert AssetNotActive(assetId);

        // 2. Get oracle price (USD) and convert to local stablecoin price
        (IOracleAdapter.PriceData memory priceData,) = oracleRouter.getFreshestPrice(assetId);
        uint256 localPrice = PriceLib.convertUsdPrice(priceData.price, stablecoinPerUsd);

        // 3. Apply dynamic spread (buy = price goes UP → user gets fewer tokens)
        uint256 spreadBps = currentSpread(assetId);
        uint256 effectivePrice = PriceLib.applyBuySpread(localPrice, spreadBps);

        // 4. Calculate tokens received
        tokensReceived = PriceLib.stablecoinToTokens(stablecoinAmount, effectivePrice);

        // 5. Calculate fee for tracking (spread revenue stays in vault)
        uint256 fee = (stablecoinAmount * spreadBps) / BPS_DENOMINATOR;

        // 6. Check risk limits
        if (!vault.canAcceptTrade(assetId, stablecoinAmount, asset.maxExposureBps, asset.maxSingleTradeBps)) {
            revert TradeLimitExceeded(assetId, stablecoinAmount);
        }

        // 7. Transfer stablecoin from user to vault
        stablecoin.safeTransferFrom(msg.sender, address(vault), stablecoinAmount);

        // 8. Mint commodity tokens to user
        CommodityToken(asset.tokenAddress).mint(msg.sender, tokensReceived);

        // 9. Record exposure in vault
        vault.recordBuy(assetId, stablecoinAmount);

        // 10. Update position tracking
        positions[msg.sender][assetId].totalCostBasis += stablecoinAmount;
        positions[msg.sender][assetId].totalTokens += tokensReceived;

        // 11. Update fee tracking
        totalFeesCollected += fee;
        feesPerAsset[assetId] += fee;
        totalTradeCount++;

        emit TradeExecuted(
            msg.sender,
            assetId,
            true,
            stablecoinAmount,
            tokensReceived,
            priceData.price,
            effectivePrice,
            spreadBps,
            fee,
            block.timestamp
        );
    }

    /// @notice Sell commodity tokens for stablecoin (mAED)
    /// @param assetId The asset to sell
    /// @param tokenAmount Amount of commodity tokens to sell (18 decimals)
    /// @return stablecoinReceived Amount of stablecoin received (6 decimals)
    function sell(bytes32 assetId, uint256 tokenAmount)
        external
        whenNotPaused
        nonReentrant
        onlyWhitelisted
        returns (uint256 stablecoinReceived)
    {
        if (tokenAmount == 0) revert ZeroAmount();

        // 1. Verify asset is active
        AssetRegistry.AssetConfig memory asset = registry.getAsset(assetId);
        if (!asset.isActive || asset.addedAt == 0) revert AssetNotActive(assetId);

        // 2. Get oracle price (USD) and convert to local stablecoin price
        (IOracleAdapter.PriceData memory priceData,) = oracleRouter.getFreshestPrice(assetId);
        uint256 localPrice = PriceLib.convertUsdPrice(priceData.price, stablecoinPerUsd);

        // 3. Apply dynamic spread (sell = price goes DOWN → user gets less stablecoin)
        uint256 spreadBps = currentSpread(assetId);
        uint256 effectivePrice = PriceLib.applySellSpread(localPrice, spreadBps);

        // 4. Calculate stablecoin received
        stablecoinReceived = PriceLib.tokensToStablecoin(tokenAmount, effectivePrice);

        // 5. Calculate fee for tracking
        uint256 stablecoinAtOracle = PriceLib.tokensToStablecoin(tokenAmount, localPrice);
        uint256 fee = stablecoinAtOracle > stablecoinReceived ? stablecoinAtOracle - stablecoinReceived : 0;

        // 6. Check vault has enough stablecoin
        if (stablecoin.balanceOf(address(vault)) < stablecoinReceived) revert InsufficientLiquidity();

        // 7. Burn commodity tokens from user (no approval needed — minter privilege)
        CommodityToken(asset.tokenAddress).minterBurn(msg.sender, tokenAmount);

        // 8. Transfer stablecoin from vault to user
        vault.transferOut(msg.sender, stablecoinReceived);

        // 9. Record sell in vault
        vault.recordSell(assetId, stablecoinReceived);

        // 10. Update position tracking
        Position storage pos = positions[msg.sender][assetId];
        if (tokenAmount >= pos.totalTokens) {
            pos.totalCostBasis = 0;
            pos.totalTokens = 0;
        } else {
            uint256 costBasisReduction = (pos.totalCostBasis * tokenAmount) / pos.totalTokens;
            pos.totalCostBasis -= costBasisReduction;
            pos.totalTokens -= tokenAmount;
        }

        // 11. Fee tracking
        totalFeesCollected += fee;
        feesPerAsset[assetId] += fee;
        totalTradeCount++;

        emit TradeExecuted(
            msg.sender,
            assetId,
            false,
            stablecoinReceived,
            tokenAmount,
            priceData.price,
            effectivePrice,
            spreadBps,
            fee,
            block.timestamp
        );
    }

    // ========== Spread Calculation ==========

    /// @notice Calculate the current dynamic spread for an asset
    /// @dev spread = baseSpread + (baseSpread * utilization * scalingFactor / BPS^2)
    ///      Capped at baseSpread * MAX_SPREAD_MULTIPLIER
    function currentSpread(bytes32 assetId) public view returns (uint256 spreadBps) {
        AssetRegistry.AssetConfig memory asset = registry.getAsset(assetId);
        uint256 base = asset.baseSpreadBps;

        uint256 util = vault.utilization();

        uint256 dynamic = (base * util * spreadScalingFactor) / (BPS_DENOMINATOR * BPS_DENOMINATOR);
        spreadBps = base + dynamic;

        uint256 maxSpread = base * MAX_SPREAD_MULTIPLIER;
        if (spreadBps > maxSpread) {
            spreadBps = maxSpread;
        }
    }

    // ========== Quote Functions ==========

    /// @notice Get a buy quote without executing
    function quoteBuy(bytes32 assetId, uint256 stablecoinAmount)
        external
        view
        returns (uint256 tokensOut, uint256 effectivePrice, uint256 spreadBps_, uint256 fee)
    {
        (IOracleAdapter.PriceData memory priceData,) = oracleRouter.getFreshestPrice(assetId);
        uint256 localPrice = PriceLib.convertUsdPrice(priceData.price, stablecoinPerUsd);

        spreadBps_ = currentSpread(assetId);
        effectivePrice = PriceLib.applyBuySpread(localPrice, spreadBps_);
        tokensOut = PriceLib.stablecoinToTokens(stablecoinAmount, effectivePrice);
        fee = (stablecoinAmount * spreadBps_) / BPS_DENOMINATOR;
    }

    /// @notice Get a sell quote without executing
    function quoteSell(bytes32 assetId, uint256 tokenAmount)
        external
        view
        returns (uint256 stablecoinOut, uint256 effectivePrice, uint256 spreadBps_, uint256 fee)
    {
        (IOracleAdapter.PriceData memory priceData,) = oracleRouter.getFreshestPrice(assetId);
        uint256 localPrice = PriceLib.convertUsdPrice(priceData.price, stablecoinPerUsd);

        spreadBps_ = currentSpread(assetId);
        effectivePrice = PriceLib.applySellSpread(localPrice, spreadBps_);
        stablecoinOut = PriceLib.tokensToStablecoin(tokenAmount, effectivePrice);

        uint256 stablecoinAtOracle = PriceLib.tokensToStablecoin(tokenAmount, localPrice);
        fee = stablecoinAtOracle > stablecoinOut ? stablecoinAtOracle - stablecoinOut : 0;
    }

    /// @notice Get a user's position with current PnL
    function getPosition(address user, bytes32 assetId)
        external
        view
        returns (uint256 tokens, uint256 costBasis, uint256 currentValue, int256 pnl)
    {
        Position memory pos = positions[user][assetId];
        tokens = pos.totalTokens;
        costBasis = pos.totalCostBasis;

        if (tokens > 0) {
            try oracleRouter.getFreshestPrice(assetId) returns (
                IOracleAdapter.PriceData memory priceData, address
            ) {
                uint256 localPrice = PriceLib.convertUsdPrice(priceData.price, stablecoinPerUsd);
                currentValue = PriceLib.tokensToStablecoin(tokens, localPrice);
                pnl = int256(currentValue) - int256(costBasis);
            } catch {
                currentValue = 0;
                pnl = 0;
            }
        }
    }

    // ========== Admin ==========

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Update FX rate. Set to 367250000 for AED, 100000000 for USD.
    function setFxRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert ZeroFxRate();
        uint256 oldRate = stablecoinPerUsd;
        stablecoinPerUsd = newRate;
        emit FxRateUpdated(oldRate, newRate);
    }

    function setSpreadScalingFactor(uint256 factor) external onlyOwner {
        spreadScalingFactor = factor;
        emit SpreadScalingUpdated(factor);
    }

    /// @notice Set or update the UserRegistry for whitelist checks.
    ///         Set to address(0) to disable whitelist enforcement.
    function setUserRegistry(address registry_) external onlyOwner {
        userRegistry = UserRegistry(registry_);
        emit UserRegistryUpdated(registry_);
    }
}
