// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {SimpleAccount} from "@account-abstraction/samples/SimpleAccount.sol";
import {SimpleAccountFactory} from "@account-abstraction/samples/SimpleAccountFactory.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ADINativePaymaster} from "../../src/paymaster/ADINativePaymaster.sol";
import {SponsorshipLib} from "../../src/paymaster/SponsorshipLib.sol";

/// @title E2EFailureCases
/// @notice Demonstrates paymaster rejection for invalid sponsorship attempts.
///
///   Failure Cases:
///   1. Invalid sponsor signature
///   2. Expired sponsorship window
///   3. Spend cap exceeded
///
/// @dev Usage: forge script E2EFailureCases -f adi_testnet --broadcast
contract E2EFailureCases is Script {
    IEntryPoint internal entryPoint;
    ADINativePaymaster internal paymaster;
    address internal smartAccount;
    uint256 internal deployerKey;
    uint256 internal sponsorKey;
    uint256 internal accountOwnerKey;

    function run() external {
        deployerKey = vm.envUint("PRIVATE_KEY");
        sponsorKey = vm.envOr("SPONSOR_SIGNER_KEY", deployerKey);
        accountOwnerKey = vm.envOr("ACCOUNT_OWNER_KEY", uint256(keccak256("e2e-failure-demo")));

        entryPoint = IEntryPoint(vm.envAddress("ENTRYPOINT"));
        SimpleAccountFactory factory = SimpleAccountFactory(vm.envAddress("SIMPLE_ACCOUNT_FACTORY"));
        paymaster = ADINativePaymaster(payable(vm.envAddress("NATIVE_PAYMASTER")));

        console.log("=== E2E Failure Cases Demonstration ===\n");

        // Setup: deploy account
        uint256 salt = 99;
        smartAccount = factory.getAddress(vm.addr(accountOwnerKey), salt);

        vm.broadcast(deployerKey);
        factory.createAccount(vm.addr(accountOwnerKey), salt);
        console.log("Setup: Account deployed at", smartAccount);

        _case1_invalidSignature();
        _case2_expiredSponsorship();
        _case3_spendCapExceeded();

        console.log("\n=== All Failure Cases Demonstrated ===");
    }

    function _case1_invalidSignature() internal {
        console.log("\n--- Case 1: Invalid Sponsor Signature ---");

        uint256 wrongKey = uint256(keccak256("wrong-signer-key"));
        bytes memory sponsorData = _buildSponsorDataWithKey(
            smartAccount, 1000, wrongKey
        );

        PackedUserOperation memory op = _buildOp(smartAccount, 0, sponsorData);
        op.signature = _signOp(op);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        try entryPoint.handleOps(ops, payable(vm.addr(deployerKey))) {
            console.log("  UNEXPECTED: Should have reverted!");
        } catch {
            console.log("  REVERTED as expected (InvalidSignature)");
        }
    }

    function _case2_expiredSponsorship() internal {
        console.log("\n--- Case 2: Expired Sponsorship ---");

        uint48 validUntil = uint48(block.timestamp > 10 ? block.timestamp - 1 : 0);
        uint48 validAfter = uint48(block.timestamp > 3600 ? block.timestamp - 3600 : 0);
        uint256 sNonce = 2000;

        bytes32 hash = SponsorshipLib.getHash(
            0x00, validUntil, validAfter, smartAccount, sNonce,
            block.chainid, address(entryPoint), address(paymaster)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sponsorKey, MessageHashUtils.toEthSignedMessageHash(hash));

        bytes memory customData = SponsorshipLib.encode(
            0x00, validUntil, validAfter, sNonce, abi.encodePacked(r, s, v)
        );

        PackedUserOperation memory op = _buildOp(smartAccount, 0, customData);
        op.signature = _signOp(op);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        try entryPoint.handleOps(ops, payable(vm.addr(deployerKey))) {
            console.log("  UNEXPECTED: Should have reverted!");
        } catch {
            console.log("  REVERTED as expected (ExpiredSponsorship)");
        }
    }

    function _case3_spendCapExceeded() internal {
        console.log("\n--- Case 3: Spend Cap Exceeded ---");

        vm.broadcast(deployerKey);
        paymaster.setAccountSpendCap(smartAccount, 1); // 1 wei cap

        bytes memory sponsorData = _buildSponsorDataWithKey(
            smartAccount, 3000, sponsorKey
        );

        PackedUserOperation memory op = _buildOp(smartAccount, 0, sponsorData);
        op.signature = _signOp(op);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        try entryPoint.handleOps(ops, payable(vm.addr(deployerKey))) {
            console.log("  UNEXPECTED: Should have reverted!");
        } catch {
            console.log("  REVERTED as expected (SpendCapExceeded)");
        }

        vm.broadcast(deployerKey);
        paymaster.setAccountSpendCap(smartAccount, 0);
    }

    // ──────────────── Helpers ────────────────

    function _buildOp(
        address sender, uint256 nonce, bytes memory paymasterCustomData
    ) internal view returns (PackedUserOperation memory op) {
        op.sender = sender;
        op.nonce = nonce;
        op.callData = abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, ""));
        op.accountGasLimits = bytes32(uint256(200_000) << 128 | uint256(200_000));
        op.preVerificationGas = 60_000;
        op.gasFees = bytes32(uint256(100 gwei) << 128 | uint256(600 gwei));
        op.paymasterAndData = abi.encodePacked(
            address(paymaster), uint128(100_000), uint128(50_000), paymasterCustomData
        );
    }

    function _signOp(PackedUserOperation memory op) internal view returns (bytes memory) {
        bytes32 opHash = entryPoint.getUserOpHash(op);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(accountOwnerKey, MessageHashUtils.toEthSignedMessageHash(opHash));
        return abi.encodePacked(r, s, v);
    }

    function _buildSponsorDataWithKey(
        address account, uint256 sponsorNonce, uint256 signerKey
    ) internal view returns (bytes memory) {
        uint48 validUntil = uint48(block.timestamp + 3600);
        uint48 validAfter = uint48(block.timestamp);
        bytes32 hash = SponsorshipLib.getHash(
            0x00, validUntil, validAfter, account, sponsorNonce,
            block.chainid, address(entryPoint), address(paymaster)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, MessageHashUtils.toEthSignedMessageHash(hash));
        return SponsorshipLib.encode(0x00, validUntil, validAfter, sponsorNonce, abi.encodePacked(r, s, v));
    }
}
