// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";

/// @title BaseOracleAdapter
/// @notice Abstract base for all oracle adapters. Handles price storage, validation, and staleness checks.
abstract contract BaseOracleAdapter is IOracleAdapter, Ownable2Step {
    // --- Storage ---
    mapping(bytes32 => PriceData) internal _prices;

    // --- Events ---
    event PriceUpdated(bytes32 indexed assetId, uint256 price, uint256 timestamp, string source);

    // --- Errors ---
    error ZeroPrice();
    error StaleTimestamp(uint256 provided, uint256 existing);
    error Unauthorized();

    // --- Constructor ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- External Functions ---

    function getPrice(bytes32 assetId) external view override returns (PriceData memory) {
        return _prices[assetId];
    }

    function updatePrice(bytes32 assetId, uint256 price, uint256 timestamp) external override {
        _authorizeUpdate();

        if (price == 0) revert ZeroPrice();

        PriceData storage existing = _prices[assetId];
        if (timestamp <= existing.timestamp) {
            revert StaleTimestamp(timestamp, existing.timestamp);
        }

        _prices[assetId] = PriceData({price: price, timestamp: timestamp, decimals: 8});

        emit PriceUpdated(assetId, price, timestamp, getSourceName());
    }

    function isStale(bytes32 assetId, uint256 maxAge) external view override returns (bool) {
        PriceData storage data = _prices[assetId];
        if (data.timestamp == 0) return true;
        return (block.timestamp - data.timestamp) > maxAge;
    }

    // --- Abstract ---
    function getSourceName() public pure virtual override returns (string memory);

    // --- Internal Hook ---
    /// @dev Override in children to implement access control for updatePrice
    function _authorizeUpdate() internal view virtual;
}
