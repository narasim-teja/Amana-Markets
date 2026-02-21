// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BasePaymaster} from "@account-abstraction/core/BasePaymaster.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "@account-abstraction/core/UserOperationLib.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SponsorshipLib} from "./SponsorshipLib.sol";

/// @title ADIErc20Paymaster
/// @notice ERC-4337 v0.7 paymaster where the smart account pays gas in an ERC-20
///         token (e.g. DDSC / MockDirham). The paymaster covers native gas and
///         deducts the equivalent ERC-20 amount from the account in postOp.
/// @dev Requires the smart account to have approved this paymaster for the ERC-20.
///      Uses a configurable native→token exchange rate with optional price markup.
contract ADIErc20Paymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    // ──────────────────────────── Events ─────────────────────────────
    event SponsorSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event Erc20GasPayment(
        address indexed account,
        bytes32 indexed userOpHash,
        uint256 erc20Amount,
        uint256 nativeGasCost
    );
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event PriceMarkupUpdated(uint256 oldMarkup, uint256 newMarkup);
    event DefaultSpendCapUpdated(uint256 oldCap, uint256 newCap);
    event AccountSpendCapUpdated(address indexed account, uint256 cap);

    // ──────────────────────────── Errors ─────────────────────────────
    error InvalidSignature();
    error InvalidMode();
    error NonceAlreadyUsed();
    error SpendCapExceeded();
    error ZeroAddress();
    error InsufficientAllowance();
    error InvalidRate();
    error InvalidMarkup();

    // ──────────────────────────── Constants ──────────────────────────
    /// @dev Base for price markup (100 = 1x, 110 = 1.1x).
    uint256 public constant MARKUP_DENOMINATOR = 100;

    // ──────────────────────────── State ──────────────────────────────
    /// @notice The ERC-20 token used for gas payment (e.g. DDSC).
    IERC20 public immutable token;

    /// @notice Decimals of the ERC-20 token.
    uint8 public immutable tokenDecimals;

    /// @notice Backend-controlled sponsor signer.
    address public sponsorSigner;

    /// @notice Exchange rate: how many token-units per 1e18 wei of native gas.
    /// @dev For DDSC (6 decimals) at 1 ADI = 3.67 DDSC: set to 3_670000 (3.67 * 1e6).
    uint256 public nativeToTokenRate;

    /// @notice Price markup in percentage (100 = no markup, 110 = 10% markup).
    uint256 public priceMarkup;

    /// @notice Cumulative ERC-20 spend per account (in token units).
    mapping(address => uint256) public accountSpendTotal;

    /// @notice Per-account ERC-20 spend cap (0 = use default).
    mapping(address => uint256) public accountSpendCap;

    /// @notice Default per-account ERC-20 spend cap.
    uint256 public defaultSpendCap;

    /// @notice Tracks used sponsor nonces.
    mapping(uint256 => bool) public usedNonces;

    // ──────────────────────────── Constructor ────────────────────────

    /// @param _entryPoint     EntryPoint v0.7 address
    /// @param _token          ERC-20 token for gas payment
    /// @param _tokenDecimals  Decimals of the ERC-20 (e.g. 6 for DDSC)
    /// @param _sponsorSigner  Initial backend sponsor signer
    /// @param _nativeToTokenRate Exchange rate (token-units per 1e18 native wei)
    /// @param _priceMarkup    Markup percentage (100 = 1x)
    /// @param _defaultSpendCap Default per-account cap in token units (0 = unlimited)
    constructor(
        IEntryPoint _entryPoint,
        IERC20 _token,
        uint8 _tokenDecimals,
        address _sponsorSigner,
        uint256 _nativeToTokenRate,
        uint256 _priceMarkup,
        uint256 _defaultSpendCap
    ) BasePaymaster(_entryPoint) {
        if (_sponsorSigner == address(0)) revert ZeroAddress();
        if (_nativeToTokenRate == 0) revert InvalidRate();
        if (_priceMarkup < MARKUP_DENOMINATOR) revert InvalidMarkup();

        token = _token;
        tokenDecimals = _tokenDecimals;
        sponsorSigner = _sponsorSigner;
        nativeToTokenRate = _nativeToTokenRate;
        priceMarkup = _priceMarkup;
        defaultSpendCap = _defaultSpendCap;
    }

    // ──────────────────────────── Paymaster Logic ────────────────────

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        address sender = userOp.sender;
        SponsorshipLib.SponsorshipData memory sd = SponsorshipLib.decode(
            userOp.paymasterAndData[PAYMASTER_DATA_OFFSET:]
        );

        // Must be ERC-20 mode
        if (sd.mode != 0x01) revert InvalidMode();

        // Replay protection
        if (usedNonces[sd.sponsorNonce]) revert NonceAlreadyUsed();
        usedNonces[sd.sponsorNonce] = true;

        // Verify sponsor signature
        _verifySponsorSignature(sd, sender);

        // Pre-check: ensure user has approved enough ERC-20 for estimated cost
        uint256 estimatedTokenCost = _nativeToToken(maxCost);
        if (token.allowance(sender, address(this)) < estimatedTokenCost) {
            revert InsufficientAllowance();
        }

        // Spend cap check (in token units)
        _checkSpendCap(sender, estimatedTokenCost);

        // Context: sender for postOp
        context = abi.encode(sender);
        validationData = _packValidationData(false, sd.validUntil, sd.validAfter);
    }

    function _verifySponsorSignature(
        SponsorshipLib.SponsorshipData memory sd,
        address sender
    ) internal view {
        bytes32 hash = SponsorshipLib.getHash(
            sd.mode,
            sd.validUntil,
            sd.validAfter,
            sender,
            sd.sponsorNonce,
            block.chainid,
            address(entryPoint),
            address(this)
        );
        address recovered = hash.toEthSignedMessageHash().recover(sd.signature);
        if (recovered != sponsorSigner) revert InvalidSignature();
    }

    function _checkSpendCap(address sender, uint256 additionalSpend) internal view {
        uint256 cap = accountSpendCap[sender];
        if (cap == 0) cap = defaultSpendCap;
        if (cap > 0 && accountSpendTotal[sender] + additionalSpend > cap) {
            revert SpendCapExceeded();
        }
    }

    function _postOp(
        PostOpMode /*mode*/,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /*actualUserOpFeePerGas*/
    ) internal override {
        address sender = abi.decode(context, (address));

        // Convert actual gas cost to token amount
        uint256 tokenAmount = _nativeToToken(actualGasCost);

        // Transfer ERC-20 from smart account to this paymaster
        token.safeTransferFrom(sender, address(this), tokenAmount);

        // Track spend
        accountSpendTotal[sender] += tokenAmount;

        emit Erc20GasPayment(sender, bytes32(0), tokenAmount, actualGasCost);
    }

    // ──────────────────────────── Rate Conversion ────────────────────

    /// @notice Convert native wei amount to ERC-20 token units.
    /// @dev Formula: tokenAmount = (nativeWei * rate * markup) / (1e18 * 100)
    ///      For DDSC (6 decimals), rate = 3_670000 means 3.67 DDSC per 1 ADI.
    function _nativeToToken(uint256 nativeWei) internal view returns (uint256) {
        return (nativeWei * nativeToTokenRate * priceMarkup) / (1e18 * MARKUP_DENOMINATOR);
    }

    /// @notice Public view of the conversion rate for transparency.
    function getTokenCost(uint256 nativeWei) external view returns (uint256) {
        return _nativeToToken(nativeWei);
    }

    // ──────────────────────────── Admin Functions ────────────────────

    function setSponsorSigner(address _newSigner) external onlyOwner {
        if (_newSigner == address(0)) revert ZeroAddress();
        emit SponsorSignerUpdated(sponsorSigner, _newSigner);
        sponsorSigner = _newSigner;
    }

    function setNativeToTokenRate(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert InvalidRate();
        emit RateUpdated(nativeToTokenRate, _rate);
        nativeToTokenRate = _rate;
    }

    function setPriceMarkup(uint256 _markup) external onlyOwner {
        if (_markup < MARKUP_DENOMINATOR) revert InvalidMarkup();
        emit PriceMarkupUpdated(priceMarkup, _markup);
        priceMarkup = _markup;
    }

    function setDefaultSpendCap(uint256 _cap) external onlyOwner {
        emit DefaultSpendCapUpdated(defaultSpendCap, _cap);
        defaultSpendCap = _cap;
    }

    function setAccountSpendCap(address _account, uint256 _cap) external onlyOwner {
        accountSpendCap[_account] = _cap;
        emit AccountSpendCapUpdated(_account, _cap);
    }

    function resetAccountSpend(address _account) external onlyOwner {
        accountSpendTotal[_account] = 0;
    }

    /// @notice Withdraw accumulated ERC-20 tokens from gas payments.
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        token.safeTransfer(to, amount);
    }

    // ──────────────────────────── Helpers ────────────────────────────

    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << 208);
    }

    receive() external payable {}
}
