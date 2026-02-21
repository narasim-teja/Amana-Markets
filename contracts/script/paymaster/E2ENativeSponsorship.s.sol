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

/// @title E2ENativeSponsorship
/// @notice End-to-end demonstration: native gas sponsorship on ADI testnet.
///
///   Flow A -- Native Sponsorship:
///   1. Counterfactual smart account (not yet deployed)
///   2. Account has ZERO native balance
///   3. Sponsored UserOperation deploys the account and executes an action
///   4. Paymaster's native deposit decreases
///
/// @dev Usage: forge script E2ENativeSponsorship -f adi_testnet --broadcast
contract E2ENativeSponsorship is Script {
    IEntryPoint internal entryPoint;
    SimpleAccountFactory internal factory;
    ADINativePaymaster internal paymaster;
    address internal smartAccount;

    uint256 internal deployerKey;
    uint256 internal sponsorKey;
    uint256 internal accountOwnerKey;

    function run() external {
        _loadConfig();
        _execute();
    }

    function _loadConfig() internal {
        deployerKey = vm.envUint("PRIVATE_KEY");
        sponsorKey = vm.envOr("SPONSOR_SIGNER_KEY", deployerKey);
        accountOwnerKey = vm.envOr("ACCOUNT_OWNER_KEY", uint256(keccak256("e2e-native-demo-v2")));

        entryPoint = IEntryPoint(vm.envAddress("ENTRYPOINT"));
        factory = SimpleAccountFactory(vm.envAddress("SIMPLE_ACCOUNT_FACTORY"));
        paymaster = ADINativePaymaster(payable(vm.envAddress("NATIVE_PAYMASTER")));

        smartAccount = factory.getAddress(vm.addr(accountOwnerKey), 0);

        console.log("=== E2E Flow A: Native Gas Sponsorship ===\n");
        console.log("EntryPoint:     ", address(entryPoint));
        console.log("Factory:        ", address(factory));
        console.log("Paymaster:      ", address(paymaster));
        console.log("Account Owner:  ", vm.addr(accountOwnerKey));
        console.log("\nSmart Account (counterfactual):", smartAccount);
        console.log("Account balance:", smartAccount.balance, "(should be 0)");
        console.log("Account code size:", smartAccount.code.length, "(should be 0)");
    }

    function _execute() internal {
        // Build initCode to deploy the account
        bytes memory initCode = abi.encodePacked(
            address(factory),
            abi.encodeCall(SimpleAccountFactory.createAccount, (vm.addr(accountOwnerKey), 0))
        );

        // Simple no-op call to demonstrate
        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        // Build sponsor data
        bytes memory sponsorData = _buildSponsorData(smartAccount, 1);

        // Build UserOp
        PackedUserOperation memory op;
        op.sender = smartAccount;
        op.nonce = 0;
        op.initCode = initCode;
        op.callData = callData;
        // Gas limits: verificationGasLimit (high 128) | callGasLimit (low 128)
        op.accountGasLimits = bytes32(uint256(200_000) << 128 | uint256(200_000));
        op.preVerificationGas = 60_000;
        // ADI testnet gas price ~552 gwei
        op.gasFees = bytes32(uint256(100 gwei) << 128 | uint256(600 gwei));
        // paymasterVerificationGas (128) | paymasterPostOpGas (128)
        op.paymasterAndData = abi.encodePacked(
            address(paymaster), uint128(100_000), uint128(50_000), sponsorData
        );

        // Sign UserOp
        bytes32 opHash = entryPoint.getUserOpHash(op);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            accountOwnerKey, MessageHashUtils.toEthSignedMessageHash(opHash)
        );
        op.signature = abi.encodePacked(r, s, v);

        // Record before
        uint256 depositBefore = paymaster.getDeposit();
        console.log("\nPaymaster deposit before:", depositBefore);

        // Submit
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        entryPoint.handleOps(ops, payable(vm.addr(deployerKey)));

        // Verify
        uint256 depositAfter = paymaster.getDeposit();
        console.log("\n=== Results ===");
        console.log("Smart Account deployed:", smartAccount.code.length > 0 ? "YES" : "NO");
        console.log("Account native balance:", smartAccount.balance, "(still 0 - gas was sponsored)");
        console.log("Paymaster deposit after:", depositAfter);
        console.log("Gas cost to paymaster:", depositBefore - depositAfter);
        console.log("Account spend tracked:", paymaster.accountSpendTotal(smartAccount));
        console.log("\n=== E2E Flow A Complete ===");
    }

    function _buildSponsorData(address account, uint256 sponsorNonce) internal view returns (bytes memory) {
        uint48 validUntil = uint48(block.timestamp + 3600);
        uint48 validAfter = uint48(block.timestamp);
        bytes32 hash = SponsorshipLib.getHash(
            0x00, validUntil, validAfter, account, sponsorNonce,
            block.chainid, address(entryPoint), address(paymaster)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            sponsorKey, MessageHashUtils.toEthSignedMessageHash(hash)
        );
        return SponsorshipLib.encode(0x00, validUntil, validAfter, sponsorNonce, abi.encodePacked(r, s, v));
    }
}
