// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {SimpleAccount} from "@account-abstraction/samples/SimpleAccount.sol";
import {SimpleAccountFactory} from "@account-abstraction/samples/SimpleAccountFactory.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ADINativePaymaster} from "../../src/paymaster/ADINativePaymaster.sol";
import {ADIErc20Paymaster} from "../../src/paymaster/ADIErc20Paymaster.sol";
import {SponsorshipLib} from "../../src/paymaster/SponsorshipLib.sol";
import {MockDirham} from "../../src/tokens/MockDirham.sol";

/// @title E2EErc20Sponsorship
/// @notice End-to-end demonstration: ERC-20 gas payment on ADI testnet.
///
///   Flow B:
///   1. Deploy smart account (native-sponsored)
///   2. Fund with DDSC only (no native tokens)
///   3. ERC20-sponsored UserOp -- gas paid in DDSC
///   4. Verify: paymaster paid native gas, DDSC deducted from account
///
/// @dev Usage: forge script E2EErc20Sponsorship -f adi_testnet --broadcast
contract E2EErc20Sponsorship is Script {
    // Store addresses to avoid stack depth issues
    IEntryPoint internal entryPoint;
    SimpleAccountFactory internal factory;
    ADINativePaymaster internal nativePaymaster;
    ADIErc20Paymaster internal erc20Paymaster;
    MockDirham internal ddsc;
    address internal smartAccount;

    uint256 internal deployerKey;
    uint256 internal sponsorKey;
    uint256 internal accountOwnerKey;

    function run() external {
        _loadConfig();
        _step1_deployAccountWithNativeSponsorship();
        _step2_fundWithDDSC();
        _step3_erc20SponsoredOp();
    }

    function _loadConfig() internal {
        deployerKey = vm.envUint("PRIVATE_KEY");
        sponsorKey = vm.envOr("SPONSOR_SIGNER_KEY", deployerKey);
        accountOwnerKey = vm.envOr("ACCOUNT_OWNER_KEY", uint256(keccak256("e2e-erc20-demo")));

        entryPoint = IEntryPoint(vm.envAddress("ENTRYPOINT"));
        factory = SimpleAccountFactory(vm.envAddress("SIMPLE_ACCOUNT_FACTORY"));
        nativePaymaster = ADINativePaymaster(payable(vm.envAddress("NATIVE_PAYMASTER")));
        erc20Paymaster = ADIErc20Paymaster(payable(vm.envAddress("ERC20_PAYMASTER")));
        ddsc = MockDirham(vm.envAddress("MOCK_DIRHAM"));

        uint256 salt = 1;
        smartAccount = factory.getAddress(vm.addr(accountOwnerKey), salt);

        console.log("=== E2E Flow B: ERC-20 Gas Payment ===\n");
        console.log("Smart Account:", smartAccount);
    }

    function _step1_deployAccountWithNativeSponsorship() internal {
        address accountOwner = vm.addr(accountOwnerKey);
        uint256 salt = 1;

        bytes memory initCode = abi.encodePacked(
            address(factory),
            abi.encodeCall(SimpleAccountFactory.createAccount, (accountOwner, salt))
        );

        // Inner call: approve DDSC for ERC20 paymaster
        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(ddsc), 0, abi.encodeCall(IERC20.approve, (address(erc20Paymaster), type(uint256).max)))
        );

        // Build native-sponsored op
        bytes memory sponsorData = _buildSponsorData(
            0x00, smartAccount, 10, address(nativePaymaster)
        );

        PackedUserOperation memory op = _buildOp(
            smartAccount, 0, initCode, callData, address(nativePaymaster), sponsorData
        );
        op.signature = _signOp(op, accountOwnerKey);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        entryPoint.handleOps(ops, payable(vm.addr(deployerKey)));
        console.log("Step 1: Account deployed + DDSC approved (native sponsored)");
    }

    function _step2_fundWithDDSC() internal {
        vm.broadcast(deployerKey);
        ddsc.mint(smartAccount, 100_000000); // 100 DDSC
        console.log("Step 2: Minted 100 DDSC to account");
    }

    function _step3_erc20SponsoredOp() internal {
        uint256 ddscBefore = ddsc.balanceOf(smartAccount);
        uint256 depositBefore = erc20Paymaster.getDeposit();
        console.log("\nDDSC balance before:", ddscBefore);
        console.log("Paymaster deposit before:", depositBefore);

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        bytes memory sponsorData = _buildSponsorData(
            0x01, smartAccount, 20, address(erc20Paymaster)
        );

        PackedUserOperation memory op = _buildOp(
            smartAccount, 1, "", callData, address(erc20Paymaster), sponsorData
        );
        op.signature = _signOp(op, accountOwnerKey);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.broadcast(deployerKey);
        entryPoint.handleOps(ops, payable(vm.addr(deployerKey)));

        // Verify
        uint256 ddscAfter = ddsc.balanceOf(smartAccount);
        uint256 depositAfter = erc20Paymaster.getDeposit();

        console.log("\n=== Results ===");
        console.log("DDSC balance after:", ddscAfter);
        console.log("DDSC deducted:", ddscBefore - ddscAfter);
        console.log("Paymaster deposit after:", depositAfter);
        console.log("Native gas paid by paymaster:", depositBefore - depositAfter);
        console.log("DDSC received by paymaster:", ddsc.balanceOf(address(erc20Paymaster)));
        console.log("\n=== E2E Flow B Complete ===");
    }

    // ──────────────── Helpers ────────────────

    function _buildOp(
        address sender, uint256 nonce, bytes memory initCode,
        bytes memory callData, address paymaster, bytes memory paymasterCustomData
    ) internal pure returns (PackedUserOperation memory op) {
        op.sender = sender;
        op.nonce = nonce;
        op.initCode = initCode;
        op.callData = callData;
        op.accountGasLimits = bytes32(uint256(200_000) << 128 | uint256(200_000));
        op.preVerificationGas = 60_000;
        op.gasFees = bytes32(uint256(100 gwei) << 128 | uint256(600 gwei));
        op.paymasterAndData = abi.encodePacked(
            paymaster, uint128(100_000), uint128(50_000), paymasterCustomData
        );
    }

    function _signOp(PackedUserOperation memory op, uint256 signerKey) internal view returns (bytes memory) {
        bytes32 opHash = entryPoint.getUserOpHash(op);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, MessageHashUtils.toEthSignedMessageHash(opHash));
        return abi.encodePacked(r, s, v);
    }

    function _buildSponsorData(
        uint8 mode, address account, uint256 sponsorNonce, address paymaster
    ) internal view returns (bytes memory) {
        uint48 validUntil = uint48(block.timestamp + 3600);
        uint48 validAfter = uint48(block.timestamp);
        bytes32 hash = SponsorshipLib.getHash(
            mode, validUntil, validAfter, account, sponsorNonce,
            block.chainid, address(entryPoint), paymaster
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sponsorKey, MessageHashUtils.toEthSignedMessageHash(hash));
        return SponsorshipLib.encode(mode, validUntil, validAfter, sponsorNonce, abi.encodePacked(r, s, v));
    }
}
