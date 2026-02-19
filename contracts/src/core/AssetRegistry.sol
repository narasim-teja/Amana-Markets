// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {CommodityTokenFactory} from "../tokens/CommodityTokenFactory.sol";

/// @title AssetRegistry
/// @notice Central registry for tradeable commodity assets. Stores config per asset
///         and deploys CommodityTokens via the factory when assets are added.
contract AssetRegistry is Ownable2Step {
    struct AssetConfig {
        bytes32 assetId;
        string name;
        string symbol;
        address tokenAddress;
        uint256 baseSpreadBps;
        uint256 maxExposureBps;
        uint256 maxSingleTradeBps;
        bool isActive;
        uint256 addedAt;
    }

    CommodityTokenFactory public immutable factory;
    address public tradingEngine;

    mapping(bytes32 => AssetConfig) internal _assets;
    bytes32[] public assetList;

    // --- Events ---
    event AssetAdded(bytes32 indexed assetId, string name, string symbol, address tokenAddress);
    event AssetPaused(bytes32 indexed assetId);
    event AssetUnpaused(bytes32 indexed assetId);
    event SpreadUpdated(bytes32 indexed assetId, uint256 oldSpread, uint256 newSpread);
    event ExposureLimitsUpdated(bytes32 indexed assetId, uint256 maxExposureBps, uint256 maxSingleTradeBps);
    event TradingEngineSet(address indexed engine);

    // --- Errors ---
    error AssetAlreadyExists(bytes32 assetId);
    error AssetNotFound(bytes32 assetId);
    error TradingEngineNotSet();
    error ZeroAddress();
    error InvalidBps(uint256 value);

    constructor(address initialOwner, address factory_) Ownable(initialOwner) {
        if (factory_ == address(0)) revert ZeroAddress();
        factory = CommodityTokenFactory(factory_);
    }

    function setTradingEngine(address engine) external onlyOwner {
        if (engine == address(0)) revert ZeroAddress();
        tradingEngine = engine;
        emit TradingEngineSet(engine);
    }

    /// @notice Add a new tradeable asset — deploys a CommodityToken via the factory
    function addAsset(
        bytes32 assetId,
        string calldata name,
        string calldata symbol,
        uint256 baseSpreadBps,
        uint256 maxExposureBps,
        uint256 maxSingleTradeBps
    ) external onlyOwner {
        if (tradingEngine == address(0)) revert TradingEngineNotSet();
        if (_assets[assetId].addedAt != 0) revert AssetAlreadyExists(assetId);
        if (baseSpreadBps == 0 || baseSpreadBps > 1000) revert InvalidBps(baseSpreadBps);
        if (maxExposureBps == 0 || maxExposureBps > 10000) revert InvalidBps(maxExposureBps);
        if (maxSingleTradeBps == 0 || maxSingleTradeBps > 10000) revert InvalidBps(maxSingleTradeBps);

        // Deploy token via factory with TradingEngine as minter
        address tokenAddress = factory.createToken(assetId, name, symbol, tradingEngine);

        _assets[assetId] = AssetConfig({
            assetId: assetId,
            name: name,
            symbol: symbol,
            tokenAddress: tokenAddress,
            baseSpreadBps: baseSpreadBps,
            maxExposureBps: maxExposureBps,
            maxSingleTradeBps: maxSingleTradeBps,
            isActive: true,
            addedAt: block.timestamp
        });

        assetList.push(assetId);
        emit AssetAdded(assetId, name, symbol, tokenAddress);
    }

    function pauseAsset(bytes32 assetId) external onlyOwner {
        if (_assets[assetId].addedAt == 0) revert AssetNotFound(assetId);
        _assets[assetId].isActive = false;
        emit AssetPaused(assetId);
    }

    function unpauseAsset(bytes32 assetId) external onlyOwner {
        if (_assets[assetId].addedAt == 0) revert AssetNotFound(assetId);
        _assets[assetId].isActive = true;
        emit AssetUnpaused(assetId);
    }

    function updateSpread(bytes32 assetId, uint256 newSpreadBps) external onlyOwner {
        if (_assets[assetId].addedAt == 0) revert AssetNotFound(assetId);
        if (newSpreadBps == 0 || newSpreadBps > 1000) revert InvalidBps(newSpreadBps);
        uint256 oldSpread = _assets[assetId].baseSpreadBps;
        _assets[assetId].baseSpreadBps = newSpreadBps;
        emit SpreadUpdated(assetId, oldSpread, newSpreadBps);
    }

    function updateExposureLimits(bytes32 assetId, uint256 maxExposure, uint256 maxSingleTrade)
        external
        onlyOwner
    {
        if (_assets[assetId].addedAt == 0) revert AssetNotFound(assetId);
        if (maxExposure == 0 || maxExposure > 10000) revert InvalidBps(maxExposure);
        if (maxSingleTrade == 0 || maxSingleTrade > 10000) revert InvalidBps(maxSingleTrade);
        _assets[assetId].maxExposureBps = maxExposure;
        _assets[assetId].maxSingleTradeBps = maxSingleTrade;
        emit ExposureLimitsUpdated(assetId, maxExposure, maxSingleTrade);
    }

    // --- View Functions ---

    function getAsset(bytes32 assetId) external view returns (AssetConfig memory) {
        return _assets[assetId];
    }

    function getAllAssets() external view returns (bytes32[] memory) {
        return assetList;
    }

    function isAssetActive(bytes32 assetId) external view returns (bool) {
        return _assets[assetId].isActive && _assets[assetId].addedAt != 0;
    }

    function assetCount() external view returns (uint256) {
        return assetList.length;
    }
}
