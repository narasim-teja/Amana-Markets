// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LiquidityVault
/// @notice Holds stablecoin (mAED) deposits from LPs. Tracks exposure per asset
///         and enforces risk limits. Only the TradingEngine can record trades
///         and transfer stablecoin out during sells.
contract LiquidityVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    address public tradingEngine;

    // --- LP Share Accounting ---
    mapping(address => uint256) public lpShares;
    uint256 public totalShares;

    // --- Exposure Tracking (in stablecoin terms, 6 decimals) ---
    mapping(bytes32 => uint256) public assetExposure;
    uint256 public totalExposure;

    // --- Risk Parameters ---
    uint256 public maxUtilizationBps = 8000; // 80%
    uint256 public constant BPS_DENOMINATOR = 10000;

    // --- Events ---
    event Deposit(address indexed lp, uint256 amount, uint256 shares);
    event Withdrawal(address indexed lp, uint256 amount, uint256 shares);
    event ExposureUpdated(bytes32 indexed assetId, uint256 assetExposure, uint256 totalExposure);
    event TradingEngineSet(address indexed engine);
    event MaxUtilizationUpdated(uint256 newMaxBps);

    // --- Errors ---
    error OnlyTradingEngine();
    error ZeroAmount();
    error InsufficientShares(uint256 requested, uint256 available);
    error InsufficientLiquidity(uint256 requested, uint256 available);
    error ZeroAddress();
    error InvalidUtilization();

    modifier onlyTradingEngine() {
        if (msg.sender != tradingEngine) revert OnlyTradingEngine();
        _;
    }

    constructor(address initialOwner, address stablecoin_) Ownable(initialOwner) {
        if (stablecoin_ == address(0)) revert ZeroAddress();
        stablecoin = IERC20(stablecoin_);
    }

    // ========== LP Functions ==========

    /// @notice Deposit stablecoin and receive LP shares
    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();

        uint256 totalAssetsBefore = totalAssets();

        if (totalShares == 0 || totalAssetsBefore == 0) {
            shares = amount; // 1:1 initial ratio
        } else {
            shares = (amount * totalShares) / totalAssetsBefore;
        }

        lpShares[msg.sender] += shares;
        totalShares += shares;

        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, shares);
    }

    /// @notice Withdraw stablecoin by burning LP shares
    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        if (shares == 0) revert ZeroAmount();
        if (lpShares[msg.sender] < shares) revert InsufficientShares(shares, lpShares[msg.sender]);

        amount = (shares * totalAssets()) / totalShares;

        uint256 available = availableLiquidity();
        if (amount > available) revert InsufficientLiquidity(amount, available);

        lpShares[msg.sender] -= shares;
        totalShares -= shares;

        stablecoin.safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount, shares);
    }

    // ========== View Functions ==========

    /// @notice Total stablecoin held by the vault
    function totalAssets() public view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    /// @notice Stablecoin available for LP withdrawal (respects utilization ratio)
    function availableLiquidity() public view returns (uint256) {
        uint256 total = totalAssets();
        if (total == 0) return 0;

        // Minimum stablecoin required to maintain utilization ratio for current exposure
        // If utilization limit is 80%, and we have 1000 exposure, we need at least 1250 total
        uint256 minRequired = (totalExposure * BPS_DENOMINATOR) / maxUtilizationBps;
        if (total <= minRequired) return 0;
        return total - minRequired;
    }

    /// @notice Current vault utilization in BPS (0-10000)
    function utilization() external view returns (uint256) {
        uint256 total = totalAssets();
        if (total == 0) return 0;
        return (totalExposure * BPS_DENOMINATOR) / total;
    }

    /// @notice Check if a trade can be accepted given risk limits
    function canAcceptTrade(
        bytes32 assetId,
        uint256 stablecoinAmount,
        uint256 maxExposureBps,
        uint256 maxSingleTradeBps
    ) external view returns (bool) {
        uint256 total = totalAssets();
        if (total == 0) return false;

        // Check 1: Global utilization limit
        uint256 newTotalExposure = totalExposure + stablecoinAmount;
        if (newTotalExposure > (total * maxUtilizationBps) / BPS_DENOMINATOR) return false;

        // Check 2: Per-asset exposure limit
        uint256 newAssetExposure = assetExposure[assetId] + stablecoinAmount;
        if (newAssetExposure > (total * maxExposureBps) / BPS_DENOMINATOR) return false;

        // Check 3: Single trade size limit
        if (stablecoinAmount > (total * maxSingleTradeBps) / BPS_DENOMINATOR) return false;

        return true;
    }

    // ========== TradingEngine Functions ==========

    /// @notice Record a buy trade — increases exposure
    function recordBuy(bytes32 assetId, uint256 stablecoinAmount) external onlyTradingEngine {
        assetExposure[assetId] += stablecoinAmount;
        totalExposure += stablecoinAmount;
        emit ExposureUpdated(assetId, assetExposure[assetId], totalExposure);
    }

    /// @notice Record a sell trade — decreases exposure (clamped to zero)
    function recordSell(bytes32 assetId, uint256 stablecoinAmount) external onlyTradingEngine {
        if (stablecoinAmount > assetExposure[assetId]) {
            totalExposure -= assetExposure[assetId];
            assetExposure[assetId] = 0;
        } else {
            assetExposure[assetId] -= stablecoinAmount;
            totalExposure -= stablecoinAmount;
        }
        emit ExposureUpdated(assetId, assetExposure[assetId], totalExposure);
    }

    /// @notice Transfer stablecoin out of vault to a recipient (sell payouts)
    function transferOut(address to, uint256 amount) external onlyTradingEngine {
        stablecoin.safeTransfer(to, amount);
    }

    // ========== Admin ==========

    function setTradingEngine(address engine) external onlyOwner {
        if (engine == address(0)) revert ZeroAddress();
        tradingEngine = engine;
        emit TradingEngineSet(engine);
    }

    function setMaxUtilization(uint256 newMaxBps) external onlyOwner {
        if (newMaxBps == 0 || newMaxBps > BPS_DENOMINATOR) revert InvalidUtilization();
        maxUtilizationBps = newMaxBps;
        emit MaxUtilizationUpdated(newMaxBps);
    }
}
