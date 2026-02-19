// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library AssetIds {
    bytes32 public constant GOLD = keccak256("XAU/USD");
    bytes32 public constant SILVER = keccak256("XAG/USD");
    bytes32 public constant OIL = keccak256("WTI/USD");
}
