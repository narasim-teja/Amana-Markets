// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseOracleAdapter} from "./BaseOracleAdapter.sol";

/// @title ManualOracleAdapter
/// @notice Admin-controlled price feed for testing and emergency fallback.
///         Only the contract owner can push prices (no relayer whitelist).
contract ManualOracleAdapter is BaseOracleAdapter {
    constructor(address initialOwner) BaseOracleAdapter(initialOwner) {}

    function getSourceName() public pure override returns (string memory) {
        return "Manual";
    }

    function _authorizeUpdate() internal view override {
        if (msg.sender != owner()) revert Unauthorized();
    }
}
