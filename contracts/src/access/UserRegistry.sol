// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title UserRegistry
/// @notice Tracks KYC/whitelist status for institutional access control.
///         Only whitelisted users can trade on TradingEngine and deposit into LiquidityVault.
contract UserRegistry is Ownable2Step {
    enum UserStatus {
        UNKNOWN,
        WHITELISTED,
        BLACKLISTED
    }

    mapping(address => UserStatus) public userStatus;
    uint256 public whitelistedCount;

    event UserWhitelisted(address indexed user, uint256 timestamp);
    event UserBlacklisted(address indexed user, uint256 timestamp);
    event UserRemoved(address indexed user, uint256 timestamp);

    error ZeroAddress();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Whitelist a single user
    function whitelistUser(address user) external onlyOwner {
        if (user == address(0)) revert ZeroAddress();
        if (userStatus[user] != UserStatus.WHITELISTED) {
            whitelistedCount++;
        }
        userStatus[user] = UserStatus.WHITELISTED;
        emit UserWhitelisted(user, block.timestamp);
    }

    /// @notice Whitelist multiple users in a single tx (batch KYC approval)
    function whitelistUsers(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert ZeroAddress();
            if (userStatus[users[i]] != UserStatus.WHITELISTED) {
                whitelistedCount++;
            }
            userStatus[users[i]] = UserStatus.WHITELISTED;
            emit UserWhitelisted(users[i], block.timestamp);
        }
    }

    /// @notice Blacklist a user (block from trading)
    function blacklistUser(address user) external onlyOwner {
        if (user == address(0)) revert ZeroAddress();
        if (userStatus[user] == UserStatus.WHITELISTED) {
            whitelistedCount--;
        }
        userStatus[user] = UserStatus.BLACKLISTED;
        emit UserBlacklisted(user, block.timestamp);
    }

    /// @notice Reset user to UNKNOWN status
    function removeUser(address user) external onlyOwner {
        if (user == address(0)) revert ZeroAddress();
        if (userStatus[user] == UserStatus.WHITELISTED) {
            whitelistedCount--;
        }
        userStatus[user] = UserStatus.UNKNOWN;
        emit UserRemoved(user, block.timestamp);
    }

    /// @notice Check if a user is whitelisted
    function isWhitelisted(address user) external view returns (bool) {
        return userStatus[user] == UserStatus.WHITELISTED;
    }

    /// @notice Check if a user is blacklisted
    function isBlacklisted(address user) external view returns (bool) {
        return userStatus[user] == UserStatus.BLACKLISTED;
    }
}
