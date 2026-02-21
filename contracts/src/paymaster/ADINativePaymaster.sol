// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {BasePaymaster} from "@account-abstraction/core/BasePaymaster.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "@account-abstraction/core/UserOperationLib.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SponsorshipLib} from "./SponsorshipLib.sol";

/// @title ADINativePaymaster
/// @notice ERC-4337 v0.7 paymaster that sponsors gas using native ADI tokens.
///         A backend-controlled sponsor signer authorises each sponsorship.
/// @dev Includes per-account spend caps and nonce-based replay protection.
contract ADINativePaymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ──────────────────────────── Events ─────────────────────────────
    event SponsorSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event GasSponsored(address indexed account, bytes32 indexed userOpHash, uint256 actualGasCost);
    event DefaultSpendCapUpdated(uint256 oldCap, uint256 newCap);
    event AccountSpendCapUpdated(address indexed account, uint256 cap);

    // ──────────────────────────── Errors ─────────────────────────────
    error InvalidSignature();
    error InvalidMode();
    error NonceAlreadyUsed();
    error SpendCapExceeded();
    error ZeroAddress();

    // ──────────────────────────── State ──────────────────────────────
    /// @notice Address of the backend-controlled sponsor signer.
    address public sponsorSigner;

    /// @notice Cumulative native gas spent per smart account.
    mapping(address => uint256) public accountSpendTotal;

    /// @notice Per-account spend cap override (0 = use defaultSpendCap).
    mapping(address => uint256) public accountSpendCap;

    /// @notice Default per-account spend cap in wei.
    uint256 public defaultSpendCap;

    /// @notice Tracks used sponsor nonces to prevent replay.
    mapping(uint256 => bool) public usedNonces;

    // ──────────────────────────── Constructor ────────────────────────
    constructor(
        IEntryPoint _entryPoint,
        address _sponsorSigner,
        uint256 _defaultSpendCap
    ) BasePaymaster(_entryPoint) {
        if (_sponsorSigner == address(0)) revert ZeroAddress();
        sponsorSigner = _sponsorSigner;
        defaultSpendCap = _defaultSpendCap;
    }

    // ──────────────────────────── Paymaster Logic ────────────────────

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        // Extract custom data after the 52-byte v0.7 header
        bytes calldata paymasterData = userOp.paymasterAndData[PAYMASTER_DATA_OFFSET:];
        SponsorshipLib.SponsorshipData memory sd = SponsorshipLib.decode(paymasterData);

        // Must be native mode
        if (sd.mode != 0x00) revert InvalidMode();

        // Replay protection
        if (usedNonces[sd.sponsorNonce]) revert NonceAlreadyUsed();
        usedNonces[sd.sponsorNonce] = true;

        // Spend cap check
        uint256 cap = accountSpendCap[userOp.sender];
        if (cap == 0) cap = defaultSpendCap;
        if (cap > 0 && accountSpendTotal[userOp.sender] + maxCost > cap) {
            revert SpendCapExceeded();
        }

        // Verify sponsor signature
        bytes32 hash = SponsorshipLib.getHash(
            sd.mode,
            sd.validUntil,
            sd.validAfter,
            userOp.sender,
            sd.sponsorNonce,
            block.chainid,
            address(entryPoint),
            address(this)
        );

        address recovered = hash.toEthSignedMessageHash().recover(sd.signature);
        if (recovered != sponsorSigner) revert InvalidSignature();

        // Encode context for postOp (sender for spend tracking)
        context = abi.encode(userOp.sender);

        // Pack validationData: sigAuthorizer=0 (valid), validUntil, validAfter
        validationData = _packValidationData(false, sd.validUntil, sd.validAfter);
    }

    function _postOp(
        PostOpMode /*mode*/,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /*actualUserOpFeePerGas*/
    ) internal override {
        address sender = abi.decode(context, (address));
        accountSpendTotal[sender] += actualGasCost;
        emit GasSponsored(sender, bytes32(0), actualGasCost);
    }

    // ──────────────────────────── Admin Functions ────────────────────

    function setSponsorSigner(address _newSigner) external onlyOwner {
        if (_newSigner == address(0)) revert ZeroAddress();
        emit SponsorSignerUpdated(sponsorSigner, _newSigner);
        sponsorSigner = _newSigner;
    }

    function setDefaultSpendCap(uint256 _cap) external onlyOwner {
        emit DefaultSpendCapUpdated(defaultSpendCap, _cap);
        defaultSpendCap = _cap;
    }

    function setAccountSpendCap(address _account, uint256 _cap) external onlyOwner {
        accountSpendCap[_account] = _cap;
        emit AccountSpendCapUpdated(_account, _cap);
    }

    /// @notice Reset an account's cumulative spend counter.
    function resetAccountSpend(address _account) external onlyOwner {
        accountSpendTotal[_account] = 0;
    }

    // ──────────────────────────── Helpers ────────────────────────────

    /// @dev Packs validation data in the format expected by EntryPoint v0.7.
    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << 208);
    }

    /// @notice Receive native tokens (for direct funding).
    receive() external payable {}
}
