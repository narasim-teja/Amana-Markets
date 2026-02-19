// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockDirham
/// @notice Testnet Dirham stablecoin (mAED) — aligned with ADI Chain's Dirham ecosystem.
///         Anyone can mint (testnet faucet). 6 decimals like USDC/USDT.
contract MockDirham is ERC20 {
    constructor() ERC20("Mock Dirham", "mAED") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Anyone can mint — testnet only
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
