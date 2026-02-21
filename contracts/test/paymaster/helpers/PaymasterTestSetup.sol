// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {EntryPoint} from "@account-abstraction/core/EntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {SimpleAccount} from "@account-abstraction/samples/SimpleAccount.sol";
import {SimpleAccountFactory} from "@account-abstraction/samples/SimpleAccountFactory.sol";
import {UserOperationLib} from "@account-abstraction/core/UserOperationLib.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {ADINativePaymaster} from "../../../src/paymaster/ADINativePaymaster.sol";
import {ADIErc20Paymaster} from "../../../src/paymaster/ADIErc20Paymaster.sol";
import {SponsorshipLib} from "../../../src/paymaster/SponsorshipLib.sol";
import {MockDirham} from "../../../src/tokens/MockDirham.sol";

/// @title PaymasterTestSetup
/// @notice Shared test harness for paymaster tests.
///         Deploys EntryPoint, SimpleAccountFactory, both paymasters, and MockDirham.
abstract contract PaymasterTestSetup is Test {
    // ──── Core ERC-4337 ────
    IEntryPoint public entryPoint;
    SimpleAccountFactory public accountFactory;

    // ──── Paymasters ────
    ADINativePaymaster public nativePaymaster;
    ADIErc20Paymaster public erc20Paymaster;

    // ──── Token ────
    MockDirham public ddsc;

    // ──── Actors ────
    address public owner;
    uint256 public ownerKey;
    address public sponsorSigner;
    uint256 public sponsorKey;
    address public accountOwner;
    uint256 public accountOwnerKey;
    address public beneficiary;

    // ──── Config ────
    uint256 public constant DEFAULT_SPEND_CAP = 10 ether;
    uint256 public constant NATIVE_TO_TOKEN_RATE = 3_670000; // 3.67 DDSC per ADI
    uint256 public constant PRICE_MARKUP = 110; // 10% markup
    uint256 public constant INITIAL_DEPOSIT = 100 ether;

    function setUp() public virtual {
        // Generate keys
        (owner, ownerKey) = makeAddrAndKey("owner");
        (sponsorSigner, sponsorKey) = makeAddrAndKey("sponsor");
        (accountOwner, accountOwnerKey) = makeAddrAndKey("accountOwner");
        beneficiary = makeAddr("beneficiary");

        // Fund owner before deployments
        vm.deal(owner, 1000 ether);

        vm.startPrank(owner);

        // Deploy EntryPoint
        entryPoint = new EntryPoint();

        // Deploy SimpleAccountFactory
        accountFactory = new SimpleAccountFactory(entryPoint);

        // Deploy MockDirham (DDSC)
        ddsc = new MockDirham();

        // Deploy Native Paymaster
        nativePaymaster = new ADINativePaymaster(
            entryPoint,
            sponsorSigner,
            DEFAULT_SPEND_CAP
        );
        // Fund native paymaster
        nativePaymaster.deposit{value: INITIAL_DEPOSIT}();
        nativePaymaster.addStake{value: 1 ether}(86400);

        // Deploy ERC20 Paymaster
        erc20Paymaster = new ADIErc20Paymaster(
            entryPoint,
            ddsc,
            6, // DDSC decimals
            sponsorSigner,
            NATIVE_TO_TOKEN_RATE,
            PRICE_MARKUP,
            DEFAULT_SPEND_CAP
        );
        // Fund ERC20 paymaster
        erc20Paymaster.deposit{value: INITIAL_DEPOSIT}();
        erc20Paymaster.addStake{value: 1 ether}(86400);

        vm.stopPrank();
    }

    // ──────────────────────── Helper: Create Account ─────────────────

    function _createAccount(address _owner, uint256 salt) internal returns (SimpleAccount) {
        return accountFactory.createAccount(_owner, salt);
    }

    function _getAccountAddress(address _owner, uint256 salt) internal view returns (address) {
        return accountFactory.getAddress(_owner, salt);
    }

    // ──────────────────────── Helper: Build UserOp ───────────────────

    function _buildUserOp(
        address sender,
        uint256 nonce,
        bytes memory initCode,
        bytes memory callData,
        address paymaster,
        bytes memory paymasterCustomData
    ) internal pure returns (PackedUserOperation memory op) {
        op.sender = sender;
        op.nonce = nonce;
        op.initCode = initCode;
        op.callData = callData;

        // Pack gas limits: verificationGasLimit (high 128) | callGasLimit (low 128)
        op.accountGasLimits = bytes32(uint256(500_000) << 128 | uint256(500_000));
        op.preVerificationGas = 100_000;
        // Pack gas fees: maxPriorityFeePerGas (high 128) | maxFeePerGas (low 128)
        op.gasFees = bytes32(uint256(1 gwei) << 128 | uint256(10 gwei));

        // Build paymasterAndData: address(20) + validationGas(16) + postOpGas(16) + customData
        op.paymasterAndData = abi.encodePacked(
            paymaster,
            uint128(200_000), // paymasterVerificationGasLimit
            uint128(100_000), // paymasterPostOpGasLimit
            paymasterCustomData
        );

        op.signature = "";
    }

    // ──────────────────────── Helper: Sign Sponsorship ───────────────

    function _signSponsorship(
        uint8 mode,
        uint48 validUntil,
        uint48 validAfter,
        address sender,
        uint256 sponsorNonce,
        address paymasterAddr
    ) internal view returns (bytes memory signature) {
        bytes32 hash = SponsorshipLib.getHash(
            mode,
            validUntil,
            validAfter,
            sender,
            sponsorNonce,
            block.chainid,
            address(entryPoint),
            paymasterAddr
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sponsorKey, ethSignedHash);
        signature = abi.encodePacked(r, s, v);
    }

    // ──────────────────────── Helper: Sign UserOp ────────────────────

    function _signUserOp(
        PackedUserOperation memory op,
        uint256 signerKey
    ) internal view returns (bytes memory) {
        bytes32 opHash = entryPoint.getUserOpHash(op);
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(opHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // ──────────────────────── Helper: Build + Sign Full UserOp ───────

    function _buildAndSignNativeSponsoredOp(
        address sender,
        uint256 nonce,
        bytes memory initCode,
        bytes memory callData,
        uint48 validUntil,
        uint48 validAfter,
        uint256 sponsorNonce
    ) internal view returns (PackedUserOperation memory op) {
        bytes memory sig = _signSponsorship(
            0x00, validUntil, validAfter, sender, sponsorNonce, address(nativePaymaster)
        );
        bytes memory customData = SponsorshipLib.encode(
            0x00, validUntil, validAfter, sponsorNonce, sig
        );
        op = _buildUserOp(sender, nonce, initCode, callData, address(nativePaymaster), customData);
        op.signature = _signUserOp(op, accountOwnerKey);
    }

    function _buildAndSignErc20SponsoredOp(
        address sender,
        uint256 nonce,
        bytes memory initCode,
        bytes memory callData,
        uint48 validUntil,
        uint48 validAfter,
        uint256 sponsorNonce
    ) internal view returns (PackedUserOperation memory op) {
        bytes memory sig = _signSponsorship(
            0x01, validUntil, validAfter, sender, sponsorNonce, address(erc20Paymaster)
        );
        bytes memory customData = SponsorshipLib.encode(
            0x01, validUntil, validAfter, sponsorNonce, sig
        );
        op = _buildUserOp(sender, nonce, initCode, callData, address(erc20Paymaster), customData);
        op.signature = _signUserOp(op, accountOwnerKey);
    }

    // ──────────────────────── Helper: Create initCode ────────────────

    function _getInitCode(address _owner, uint256 salt) internal view returns (bytes memory) {
        return abi.encodePacked(
            address(accountFactory),
            abi.encodeCall(SimpleAccountFactory.createAccount, (_owner, salt))
        );
    }
}
