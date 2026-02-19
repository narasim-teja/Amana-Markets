// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BaseOracleAdapter} from "./BaseOracleAdapter.sol";

/// @title RelayedOracleAdapter
/// @notice Abstract adapter that adds a relayer whitelist on top of BaseOracleAdapter.
///         Pyth, DIA, and RedStone adapters inherit from this.
abstract contract RelayedOracleAdapter is BaseOracleAdapter {
    // --- Storage ---
    mapping(address => bool) public relayers;

    // --- Events ---
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    // --- Constructor ---
    constructor(address initialOwner) BaseOracleAdapter(initialOwner) {}

    // --- Admin Functions ---

    function addRelayer(address relayer) external onlyOwner {
        relayers[relayer] = true;
        emit RelayerAdded(relayer);
    }

    function removeRelayer(address relayer) external onlyOwner {
        relayers[relayer] = false;
        emit RelayerRemoved(relayer);
    }

    // --- Auth Hook ---
    function _authorizeUpdate() internal view override {
        if (!relayers[msg.sender]) revert Unauthorized();
    }
}
