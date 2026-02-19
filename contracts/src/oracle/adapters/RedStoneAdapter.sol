// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RelayedOracleAdapter} from "./RelayedOracleAdapter.sol";

/// @title RedStoneAdapter
/// @notice Oracle adapter for prices relayed from RedStone's REST API.
contract RedStoneAdapter is RelayedOracleAdapter {
    constructor(address initialOwner) RelayedOracleAdapter(initialOwner) {}

    function getSourceName() public pure override returns (string memory) {
        return "RedStone";
    }
}
