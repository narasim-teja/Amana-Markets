// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Roles
/// @notice Role constants for future AccessControl migration.
///         Currently all contracts use Ownable2Step for simplicity.
library Roles {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
}
