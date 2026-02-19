// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RelayedOracleAdapter} from "./RelayedOracleAdapter.sol";

/// @title DIAAdapter
/// @notice Oracle adapter for prices relayed from DIA's REST API.
contract DIAAdapter is RelayedOracleAdapter {
    constructor(address initialOwner) RelayedOracleAdapter(initialOwner) {}

    function getSourceName() public pure override returns (string memory) {
        return "DIA";
    }
}
