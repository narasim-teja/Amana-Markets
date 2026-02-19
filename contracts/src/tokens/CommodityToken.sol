// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title CommodityToken
/// @notice ERC20 representing a tokenized commodity (e.g., xGOLD, xSILVER, xOIL).
///         Only the designated minter (TradingEngine) can mint and force-burn tokens.
///         Minter is immutable — set at construction.
contract CommodityToken is ERC20, ERC20Burnable {
    address public immutable minter;

    error OnlyMinter();
    error ZeroMinter();

    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinter();
        _;
    }

    constructor(string memory name_, string memory symbol_, address minter_) ERC20(name_, symbol_) {
        if (minter_ == address(0)) revert ZeroMinter();
        minter = minter_;
    }

    /// @notice Mint tokens to a recipient (only TradingEngine)
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /// @notice Privileged burn — TradingEngine burns user tokens during sell.
    ///         No allowance check needed; the minter has direct burn authority.
    function minterBurn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }
}
