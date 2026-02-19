// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IOracleAdapter {
    struct PriceData {
        uint256 price;      // Price with 8 decimals (e.g., 265000000000 = $2,650.00)
        uint256 timestamp;  // Block timestamp when price was pushed
        uint8 decimals;     // Always 8 for consistency
    }

    function getPrice(bytes32 assetId) external view returns (PriceData memory);
    function updatePrice(bytes32 assetId, uint256 price, uint256 timestamp) external;
    function getSourceName() external pure returns (string memory);
    function isStale(bytes32 assetId, uint256 maxAge) external view returns (bool);
}
