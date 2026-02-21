// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./helpers/PaymasterTestSetup.sol";

contract ADIErc20PaymasterTest is PaymasterTestSetup {
    address public smartAccount;
    uint256 public salt = 0;

    function setUp() public override {
        super.setUp();

        // Deploy the smart account (it needs to be deployed to hold ERC-20 and approve)
        SimpleAccount account = _createAccount(accountOwner, salt);
        smartAccount = address(account);

        // Mint DDSC to the smart account (simulating user with only ERC-20)
        ddsc.mint(smartAccount, 1000_000000); // 1000 DDSC

        // Approve ERC20 paymaster to spend DDSC from smart account
        // We do this by calling execute on the account from the owner
        vm.prank(accountOwner);
        account.execute(
            address(ddsc),
            0,
            abi.encodeCall(ddsc.approve, (address(erc20Paymaster), type(uint256).max))
        );
    }

    // ──────────────────── Success Cases ──────────────────────────────

    function test_erc20PaymentSuccess() public {
        uint256 ddscBefore = ddsc.balanceOf(smartAccount);
        uint256 paymasterDepositBefore = erc20Paymaster.getDeposit();

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        PackedUserOperation memory op = _buildAndSignErc20SponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        // DDSC was deducted from smart account
        assertLt(ddsc.balanceOf(smartAccount), ddscBefore);
        // Paymaster native deposit decreased (paid gas)
        assertLt(erc20Paymaster.getDeposit(), paymasterDepositBefore);
        // Paymaster received DDSC
        assertGt(ddsc.balanceOf(address(erc20Paymaster)), 0);
        // Spend tracked
        assertGt(erc20Paymaster.accountSpendTotal(smartAccount), 0);
    }

    function test_erc20PaymentMultipleOps() public {
        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        // First op
        PackedUserOperation memory op1 = _buildAndSignErc20SponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op1;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        uint256 spendAfterFirst = erc20Paymaster.accountSpendTotal(smartAccount);

        // Second op
        PackedUserOperation memory op2 = _buildAndSignErc20SponsoredOp(
            smartAccount, 1, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 2
        );
        ops[0] = op2;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        assertGt(erc20Paymaster.accountSpendTotal(smartAccount), spendAfterFirst);
    }

    // ──────────────────── Failure Cases ──────────────────────────────

    function test_underfundedErc20PostOpFails() public {
        // Create a new account with tiny DDSC (not enough for gas)
        uint256 newSalt = 99;
        SimpleAccount newAccount = _createAccount(accountOwner, newSalt);
        address newSmartAccount = address(newAccount);

        // Give just 1 unit of DDSC — not enough to cover gas
        ddsc.mint(newSmartAccount, 1);

        // Approve paymaster
        vm.prank(accountOwner);
        newAccount.execute(
            address(ddsc),
            0,
            abi.encodeCall(ddsc.approve, (address(erc20Paymaster), type(uint256).max))
        );

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        // When postOp fails (insufficient balance for transfer), EntryPoint handles it:
        // - The inner call reverts (postOpReverted mode)
        // - Paymaster still pays gas from its deposit
        // - handleOps doesn't revert, but the user's inner call is reverted
        // - DDSC balance stays the same (transfer failed)
        uint256 ddscBefore = ddsc.balanceOf(newSmartAccount);

        PackedUserOperation memory op = _buildAndSignErc20SponsoredOp(
            newSmartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 100
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        // DDSC balance didn't increase (postOp failed, so no DDSC transferred out)
        // The paymaster ate the gas cost from its native deposit
        assertEq(ddsc.balanceOf(newSmartAccount), ddscBefore);
    }

    function test_insufficientAllowanceReverts() public {
        // Create a new account with DDSC but no approval
        uint256 newSalt = 88;
        SimpleAccount newAccount = _createAccount(accountOwner, newSalt);
        address newSmartAccount = address(newAccount);
        ddsc.mint(newSmartAccount, 1000_000000);
        // No approval given!

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        PackedUserOperation memory op = _buildAndSignErc20SponsoredOp(
            newSmartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 200
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_invalidSignatureReverts() public {
        (, uint256 wrongKey) = makeAddrAndKey("wrongSponsor");

        bytes32 hash = SponsorshipLib.getHash(
            0x01,
            uint48(block.timestamp + 3600),
            uint48(block.timestamp),
            smartAccount,
            1,
            block.chainid,
            address(entryPoint),
            address(erc20Paymaster)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSignedHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        bytes memory customData = SponsorshipLib.encode(
            0x01, uint48(block.timestamp + 3600), uint48(block.timestamp), 1, wrongSig
        );

        PackedUserOperation memory op = _buildUserOp(
            smartAccount, 0, "",
            abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, "")),
            address(erc20Paymaster), customData
        );
        op.signature = _signUserOp(op, accountOwnerKey);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    function test_spendCapEnforced() public {
        // Set a very low DDSC spend cap
        vm.prank(owner);
        erc20Paymaster.setAccountSpendCap(smartAccount, 1); // 1 token-unit cap

        bytes memory callData = abi.encodeCall(
            SimpleAccount.execute,
            (address(0xdead), 0, "")
        );

        PackedUserOperation memory op = _buildAndSignErc20SponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;

        vm.prank(beneficiary);
        vm.expectRevert();
        entryPoint.handleOps(ops, payable(beneficiary));
    }

    // ──────────────────── Rate Conversion ─────────────────────────────

    function test_rateConversionAccuracy() public view {
        // 1 ADI (1e18 wei) at rate 3_670000 with 110% markup
        // Expected: (1e18 * 3_670000 * 110) / (1e18 * 100) = 3_670000 * 1.1 = 4_037000
        uint256 tokenCost = erc20Paymaster.getTokenCost(1 ether);
        assertEq(tokenCost, 4_037000); // 4.037 DDSC (6 decimals)
    }

    function test_rateConversionSmallAmount() public view {
        // 0.001 ADI at rate 3_670000 with 110% markup
        uint256 tokenCost = erc20Paymaster.getTokenCost(0.001 ether);
        assertEq(tokenCost, 4037); // 0.004037 DDSC
    }

    function test_priceMarkupApplied() public {
        // Change markup to 150% (50% premium)
        vm.prank(owner);
        erc20Paymaster.setPriceMarkup(150);

        uint256 tokenCost = erc20Paymaster.getTokenCost(1 ether);
        // (1e18 * 3_670000 * 150) / (1e18 * 100) = 5_505000
        assertEq(tokenCost, 5_505000);
    }

    // ──────────────────── Admin Functions ─────────────────────────────

    function test_setNativeToTokenRate() public {
        vm.prank(owner);
        erc20Paymaster.setNativeToTokenRate(5_000000); // 5 DDSC per ADI
        assertEq(erc20Paymaster.nativeToTokenRate(), 5_000000);
    }

    function test_setPriceMarkup() public {
        vm.prank(owner);
        erc20Paymaster.setPriceMarkup(120);
        assertEq(erc20Paymaster.priceMarkup(), 120);
    }

    function test_withdrawTokens() public {
        // First do a sponsored op to get some DDSC in the paymaster
        bytes memory callData = abi.encodeCall(SimpleAccount.execute, (address(0xdead), 0, ""));
        PackedUserOperation memory op = _buildAndSignErc20SponsoredOp(
            smartAccount, 0, "", callData,
            uint48(block.timestamp + 3600), uint48(block.timestamp), 1
        );
        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = op;
        vm.prank(beneficiary);
        entryPoint.handleOps(ops, payable(beneficiary));

        uint256 paymasterBalance = ddsc.balanceOf(address(erc20Paymaster));
        assertGt(paymasterBalance, 0);

        // Withdraw
        address receiver = makeAddr("receiver");
        vm.prank(owner);
        erc20Paymaster.withdrawTokens(receiver, paymasterBalance);
        assertEq(ddsc.balanceOf(receiver), paymasterBalance);
        assertEq(ddsc.balanceOf(address(erc20Paymaster)), 0);
    }
}
