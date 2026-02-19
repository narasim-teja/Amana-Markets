// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title PriceLib
/// @notice Pure math library for decimal conversions between stablecoin (6 dec),
///         oracle prices (8 dec), commodity tokens (18 dec), and FX rates.
library PriceLib {
    uint256 internal constant STABLECOIN_PRECISION = 1e6;
    uint256 internal constant PRICE_PRECISION = 1e8;
    uint256 internal constant TOKEN_PRECISION = 1e18;

    /// @dev Scaling factor: 10^(18 + 8 - 6) = 10^20
    uint256 internal constant SCALING_FACTOR = 1e20;

    uint256 internal constant BPS_DENOMINATOR = 10000;

    error ZeroPriceInput();
    error ZeroAmountInput();
    error ZeroFxRate();

    /// @notice Convert a USD-denominated price to local stablecoin price using an FX rate
    /// @param usdPrice Price in USD with 8 decimals (e.g., 265000000000 = $2,650)
    /// @param fxRate Stablecoin units per 1 USD with 8 decimals (e.g., 367250000 = 3.6725 AED/USD)
    /// @return localPrice Price in local stablecoin with 8 decimals
    function convertUsdPrice(uint256 usdPrice, uint256 fxRate) internal pure returns (uint256 localPrice) {
        if (fxRate == 0) revert ZeroFxRate();
        localPrice = (usdPrice * fxRate) / PRICE_PRECISION;
    }

    /// @notice Convert stablecoin amount to commodity token amount at a given price
    /// @param stablecoinAmount Stablecoin amount (6 decimals)
    /// @param priceWith8Dec Price with 8 decimals (in local stablecoin terms)
    /// @return tokens Token amount with 18 decimals
    /// @dev Formula: tokens = stablecoinAmount * 1e20 / price
    function stablecoinToTokens(uint256 stablecoinAmount, uint256 priceWith8Dec)
        internal
        pure
        returns (uint256 tokens)
    {
        if (priceWith8Dec == 0) revert ZeroPriceInput();
        if (stablecoinAmount == 0) revert ZeroAmountInput();
        tokens = (stablecoinAmount * SCALING_FACTOR) / priceWith8Dec;
    }

    /// @notice Convert commodity token amount to stablecoin at a given price
    /// @param tokenAmount Token amount (18 decimals)
    /// @param priceWith8Dec Price with 8 decimals (in local stablecoin terms)
    /// @return stablecoinAmount Stablecoin amount with 6 decimals
    /// @dev Formula: stablecoin = tokenAmount * price / 1e20
    function tokensToStablecoin(uint256 tokenAmount, uint256 priceWith8Dec)
        internal
        pure
        returns (uint256 stablecoinAmount)
    {
        if (priceWith8Dec == 0) revert ZeroPriceInput();
        if (tokenAmount == 0) revert ZeroAmountInput();
        stablecoinAmount = (tokenAmount * priceWith8Dec) / SCALING_FACTOR;
    }

    /// @notice Apply spread to a price (buy direction — price goes UP)
    function applyBuySpread(uint256 price, uint256 spreadBps) internal pure returns (uint256) {
        return (price * (BPS_DENOMINATOR + spreadBps)) / BPS_DENOMINATOR;
    }

    /// @notice Apply spread to a price (sell direction — price goes DOWN)
    function applySellSpread(uint256 price, uint256 spreadBps) internal pure returns (uint256) {
        return (price * (BPS_DENOMINATOR - spreadBps)) / BPS_DENOMINATOR;
    }
}
