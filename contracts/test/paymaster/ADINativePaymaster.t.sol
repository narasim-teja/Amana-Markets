// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./helpers/PaymasterTestSetup.sol";

contract ADINativePaymasterTest is PaymasterTestSetup {
    address public smartAccount;
    uint256 public salt = 0;

    function setUp() public override {
        super.setUp();
        // Get counterfactual account address (not deployed yet)
        smartAccount = _getAccountAddress(accountOwner, salt);
    }

    // ──────────────────── Success Cases ──────────────────────────────

    function test_nativeSponsorshipSuccess() public {
        // Account has zero native balance
        assertEq(smartAccount.balance, 0);
        assertEq(smartAccount.code.length, 0); // not deployed

        uint256 paymasterDepositBefore = nativePaymaster.getDeposit();

        // Build a sponsored UserOp that deploys the account and does nothing else
        bytes memory initCode = _getInitCode(accountOwner, salt);
        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        PackedUserOperation memory op = _buildAndSignNativeSponsoredOp(
            smartAccount,
            0, // nonce
            initCode,
            callData,
            uint48(block.timestamp + 3600), // valid for 1 hour
            uint48(block.timestamp),
            1 // sponsorNonce
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        // Account is now deployed
        assertGt(smartAccount.code.length, 0);
        // Paymaster deposit decreased
        assertLt(nativePaymaster.getDeposit(), paymasterDepositBefore);
        // Spend tracked
        assertGt(nativePaymaster.accountSpendTotal(smartAccount), 0);
    }

    function test_multipleOpsTrackSpend() public {
        // Deploy account first
        _createAccount(accountOwner, salt);

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        // First op
        PackedUserOperation memory op1 = _buildAndSignNativeSponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op1;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        uint256 spendAfterFirst = nativePaymaster.accountSpendTotal(smartAccount);
        assertGt(spendAfterFirst, 0);

        // Second op (different nonce)
        PackedUserOperation memory op2 = _buildAndSignNativeSponsoredOp(
            smartAccount, 1, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 2
        );
        ops[0] = op2;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        assertGt(nativePaymaster.accountSpendTotal(smartAccount), spendAfterFirst);
    }

    // ──────────────────── Failure Cases ──────────────────────────────

    function test_invalidSignatureReverts() public {
        _createAccount(accountOwner, salt);

        // Sign with a wrong key
        (, uint256 wrongKey) = makeAddrAndKey("wrongSponsor");

        bytes32 hash = SponsorshipLib.getHash(
            0x00,
            uint48(block.timestamp + 3600),
            uint48(block.timestamp),
            smartAccount,
            1,
            block.chainid,
            address(entryPoint),
            address(nativePaymaster)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        bytes memory customData = SponsorshipLib.encode(
            0x00, uint48(block.timestamp + 3600), uint48(block.timestamp), 1, wrongSig
        );

        PackedUserOperation memory op = _buildUserOp(
            smartAccount, 0, "",
            abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, "")),
            address(nativePaymaster), customData
        );
        op.signature = _signUserOp(op, accountOwnerKey);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert(); // EntryPoint wraps the revert
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_expiredSponsorshipReverts() public {
        // Warp to a reasonable timestamp to avoid underflow
        vm.warp(100_000);
        _createAccount(accountOwner, salt);

        // Set validUntil to the past
        PackedUserOperation memory op = _buildAndSignNativeSponsoredOp(
            smartAccount, 0, "",
            abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, "")),
            uint48(block.timestamp - 1), // expired!
            uint48(block.timestamp - 3600),
            1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert(); // EntryPoint rejects expired validation
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_nonceReplayReverts() public {
        _createAccount(accountOwner, salt);

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        // First op with sponsorNonce=1
        PackedUserOperation memory op1 = _buildAndSignNativeSponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op1;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        // Second op reusing sponsorNonce=1 (different account nonce though)
        PackedUserOperation memory op2 = _buildAndSignNativeSponsoredOp(
            smartAccount, 1, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1 // same sponsor nonce!
        );
        ops[0] = op2;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_spendCapEnforced() public {
        _createAccount(accountOwner, salt);

        // Set a very low spend cap
        vm.prank(owner);
        nativePaymaster.setAccountSpendCap(smartAccount, 1); // 1 wei cap

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        PackedUserOperation memory op = _buildAndSignNativeSponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_wrongModeReverts() public {
        _createAccount(accountOwner, salt);

        // Use mode 0x01 (ERC20) with the native paymaster
        bytes memory sig = _signSponsorship(
            0x01, // wrong mode for native paymaster
            uint48(block.timestamp + 3600),
            uint48(block.timestamp),
            smartAccount, 1, address(nativePaymaster)
        );
        bytes memory customData = SponsorshipLib.encode(
            0x01, uint48(block.timestamp + 3600), uint48(block.timestamp), 1, sig
        );

        PackedUserOperation memory op = _buildUserOp(
            smartAccount, 0, "",
            abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, "")),
            address(nativePaymaster), customData
        );
        op.signature = _signUserOp(op, accountOwnerKey);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    // ──────────────────── Admin Functions ─────────────────────────────

    function test_depositAndWithdraw() public {
        uint256 before = nativePaymaster.getDeposit();

        vm.prank(owner);
        nativePaymaster.deposit{value: 5 ether}();
        assertEq(nativePaymaster.getDeposit(), before + 5 ether);

        vm.prank(owner);
        nativePaymaster.withdrawTo(payable(owner), 1 ether);
        assertEq(nativePaymaster.getDeposit(), before + 4 ether);
    }

    function test_setSponsorSigner() public {
        address newSigner = makeAddr("newSigner");
        vm.prank(owner);
        nativePaymaster.setSponsorSigner(newSigner);
        assertEq(nativePaymaster.sponsorSigner(), newSigner);
    }

    function test_setDefaultSpendCap() public {
        vm.prank(owner);
        nativePaymaster.setDefaultSpendCap(50 ether);
        assertEq(nativePaymaster.defaultSpendCap(), 50 ether);
    }

    function test_resetAccountSpend() public {
        // Deploy and do a sponsored op to accumulate spend
        _createAccount(accountOwner, salt);
        bytes memory callData = abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, ""));
        PackedUserOperation memory op = _buildAndSignNativeSponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        assertGt(nativePaymaster.accountSpendTotal(smartAccount), 0);

        // Reset
        vm.prank(owner);
        nativePaymaster.resetAccountSpend(smartAccount);
        assertEq(nativePaymaster.accountSpendTotal(smartAccount), 0);
    }
}
