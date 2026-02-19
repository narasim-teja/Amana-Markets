// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IOracleAdapter} from "./interfaces/IOracleAdapter.sol";

/// @title OracleRouter
/// @notice Aggregation layer that reads prices from all registered oracle adapters.
///         Provides individual, freshest, and median price queries.
///         This contract does NOT push prices — it only reads from adapters.
contract OracleRouter is Ownable2Step {
    // --- Storage ---
    address[] public adapters;
    mapping(address => bool) public isActiveAdapter;

    mapping(bytes32 => uint256) public maxStaleness;
    uint256 public defaultMaxStaleness = 120; // 2 minutes
    uint256 public minimumSources = 1;

    // --- Events ---
    event AdapterAdded(address indexed adapter, string sourceName);
    event AdapterRemoved(address indexed adapter);
    event StalenessUpdated(bytes32 indexed assetId, uint256 maxAge);
    event DefaultStalenessUpdated(uint256 maxAge);
    event MinimumSourcesUpdated(uint256 min);

    // --- Errors ---
    error AdapterAlreadyRegistered(address adapter);
    error AdapterNotRegistered(address adapter);
    error AllSourcesStale();
    error InsufficientSources(uint256 have, uint256 need);
    error InvalidMinimumSources();
    error InvalidStaleness();

    // --- Constructor ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- View Functions ---

    /// @notice Get price from a specific adapter
    function getPriceFromSource(bytes32 assetId, address adapter)
        external
        view
        returns (IOracleAdapter.PriceData memory)
    {
        return IOracleAdapter(adapter).getPrice(assetId);
    }

    /// @notice Get prices from ALL registered adapters for an asset
    /// @return sources Array of adapter addresses
    /// @return prices Array of PriceData from each adapter
    /// @return freshCount Number of non-stale prices returned
    function getAllPrices(bytes32 assetId)
        external
        view
        returns (address[] memory sources, IOracleAdapter.PriceData[] memory prices, uint256 freshCount)
    {
        uint256 len = adapters.length;
        sources = new address[](len);
        prices = new IOracleAdapter.PriceData[](len);
        freshCount = 0;

        uint256 staleness = _getMaxStaleness(assetId);

        for (uint256 i = 0; i < len; i++) {
            sources[i] = adapters[i];
            prices[i] = IOracleAdapter(adapters[i]).getPrice(assetId);
            if (prices[i].timestamp != 0 && (block.timestamp - prices[i].timestamp) <= staleness) {
                freshCount++;
            }
        }
    }

    /// @notice Get the freshest (most recently updated) price across all adapters
    /// @dev Reverts if ALL sources are stale beyond maxStaleness
    function getFreshestPrice(bytes32 assetId)
        external
        view
        returns (IOracleAdapter.PriceData memory bestPrice, address source)
    {
        uint256 len = adapters.length;
        uint256 bestTimestamp = 0;
        uint256 staleness = _getMaxStaleness(assetId);

        for (uint256 i = 0; i < len; i++) {
            IOracleAdapter.PriceData memory p = IOracleAdapter(adapters[i]).getPrice(assetId);

            if (p.timestamp > bestTimestamp) {
                bestTimestamp = p.timestamp;
                bestPrice = p;
                source = adapters[i];
            }
        }

        if (bestTimestamp == 0 || (block.timestamp - bestTimestamp) > staleness) {
            revert AllSourcesStale();
        }
    }

    /// @notice Get the median price across all non-stale adapters
    /// @dev Reverts if non-stale source count < minimumSources
    function getMedianPrice(bytes32 assetId)
        external
        view
        returns (uint256 medianPrice, uint256 sourceCount)
    {
        uint256 len = adapters.length;
        uint256 staleness = _getMaxStaleness(assetId);

        uint256[] memory freshPrices = new uint256[](len);
        uint256 count = 0;

        for (uint256 i = 0; i < len; i++) {
            IOracleAdapter.PriceData memory p = IOracleAdapter(adapters[i]).getPrice(assetId);

            if (p.timestamp != 0 && (block.timestamp - p.timestamp) <= staleness && p.price > 0) {
                freshPrices[count] = p.price;
                count++;
            }
        }

        if (count < minimumSources) {
            revert InsufficientSources(count, minimumSources);
        }

        _sort(freshPrices, count);

        if (count % 2 == 1) {
            medianPrice = freshPrices[count / 2];
        } else {
            medianPrice = (freshPrices[count / 2 - 1] + freshPrices[count / 2]) / 2;
        }
        sourceCount = count;
    }

    /// @notice Check if we have at least minimumSources of fresh data
    function hasSufficientData(bytes32 assetId) external view returns (bool) {
        uint256 len = adapters.length;
        uint256 staleness = _getMaxStaleness(assetId);
        uint256 count = 0;

        for (uint256 i = 0; i < len; i++) {
            IOracleAdapter.PriceData memory p = IOracleAdapter(adapters[i]).getPrice(assetId);

            if (p.timestamp != 0 && (block.timestamp - p.timestamp) <= staleness && p.price > 0) {
                count++;
                if (count >= minimumSources) return true;
            }
        }
        return false;
    }

    // --- Admin Functions ---

    function addAdapter(address adapter) external onlyOwner {
        if (isActiveAdapter[adapter]) revert AdapterAlreadyRegistered(adapter);
        adapters.push(adapter);
        isActiveAdapter[adapter] = true;

        string memory name = IOracleAdapter(adapter).getSourceName();
        emit AdapterAdded(adapter, name);
    }

    function removeAdapter(address adapter) external onlyOwner {
        if (!isActiveAdapter[adapter]) revert AdapterNotRegistered(adapter);
        isActiveAdapter[adapter] = false;

        // Swap with last element and pop for O(1) removal
        uint256 len = adapters.length;
        for (uint256 i = 0; i < len; i++) {
            if (adapters[i] == adapter) {
                adapters[i] = adapters[len - 1];
                adapters.pop();
                break;
            }
        }

        emit AdapterRemoved(adapter);
    }

    function setMaxStaleness(bytes32 assetId, uint256 maxAge) external onlyOwner {
        if (maxAge == 0) revert InvalidStaleness();
        maxStaleness[assetId] = maxAge;
        emit StalenessUpdated(assetId, maxAge);
    }

    function setDefaultMaxStaleness(uint256 maxAge) external onlyOwner {
        if (maxAge == 0) revert InvalidStaleness();
        defaultMaxStaleness = maxAge;
        emit DefaultStalenessUpdated(maxAge);
    }

    function setMinimumSources(uint256 min) external onlyOwner {
        if (min == 0) revert InvalidMinimumSources();
        minimumSources = min;
        emit MinimumSourcesUpdated(min);
    }

    /// @notice Get the full list of registered adapters
    function getAdapters() external view returns (address[] memory) {
        return adapters;
    }

    // --- Internal Helpers ---

    function _getMaxStaleness(bytes32 assetId) internal view returns (uint256) {
        uint256 s = maxStaleness[assetId];
        return s > 0 ? s : defaultMaxStaleness;
    }

    /// @dev Insertion sort — safe and simple for small arrays (N <= ~10 adapters)
    function _sort(uint256[] memory arr, uint256 len) internal pure {
        for (uint256 i = 1; i < len; i++) {
            uint256 key = arr[i];
            uint256 j = i;
            while (j > 0 && arr[j - 1] > key) {
                arr[j] = arr[j - 1];
                j--;
            }
            arr[j] = key;
        }
    }
}
