// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SponsorshipLib} from "../../src/paymaster/SponsorshipLib.sol";

/// @title GenerateSponsorship
/// @notice CLI script to generate paymasterAndData for a UserOperation.
///         Useful for manual testing or integration by other teams.
///
/// @dev Usage:
///   Native: forge script GenerateSponsorship --sig "run(address,uint48,uint256)" <account> <validForSecs> <nonce> -f adi_testnet
///   ERC20:  forge script GenerateSponsorship --sig "runErc20(address,uint48,uint256)" <account> <validForSecs> <nonce> -f adi_testnet
contract GenerateSponsorship is Script {
    function run(address account, uint48 validForSeconds, uint256 sponsorNonce) external view {
        _generate(0x00, account, validForSeconds, sponsorNonce, vm.envAddress("NATIVE_PAYMASTER"));
    }

    function runErc20(address account, uint48 validForSeconds, uint256 sponsorNonce) external view {
        _generate(0x01, account, validForSeconds, sponsorNonce, vm.envAddress("ERC20_PAYMASTER"));
    }

    function _generate(
        uint8 mode,
        address account,
        uint48 validForSeconds,
        uint256 sponsorNonce,
        address paymaster
    ) internal view {
        uint256 sponsorKey = vm.envUint("SPONSOR_SIGNER_KEY");
        address entryPointAddr = vm.envAddress("ENTRYPOINT");

        uint48 validAfter = uint48(block.timestamp);
        uint48 validUntil = uint48(block.timestamp + validForSeconds);

        console.log("=== Generate Sponsorship Data ===");
        console.log("Mode:          ", mode == 0x00 ? "NATIVE" : "ERC20");
        console.log("Account:       ", account);
        console.log("Paymaster:     ", paymaster);
        console.log("Valid After:   ", validAfter);
        console.log("Valid Until:   ", validUntil);
        console.log("Sponsor Nonce: ", sponsorNonce);
        console.log("Chain ID:      ", block.chainid);
        console.log("EntryPoint:    ", entryPointAddr);

        bytes32 hash = SponsorshipLib.getHash(
            mode, validUntil, validAfter, account, sponsorNonce,
            block.chainid, entryPointAddr, paymaster
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            sponsorKey,
            MessageHashUtils.toEthSignedMessageHash(hash)
        );
        bytes memory signature = abi.encodePacked(r, s, v);

        bytes memory customData = SponsorshipLib.encode(
            mode, validUntil, validAfter, sponsorNonce, signature
        );

        // Full paymasterAndData = paymaster(20) + validationGas(16) + postOpGas(16) + customData
        bytes memory paymasterAndData = abi.encodePacked(
            paymaster,
            uint128(200_000),  // paymasterVerificationGasLimit
            uint128(100_000),  // paymasterPostOpGasLimit
            customData
        );

        console.log("\n=== Output ===");
        console.log("Custom Data (hex):");
        console.logBytes(customData);
        console.log("\nFull paymasterAndData (hex):");
        console.logBytes(paymasterAndData);
        console.log("\nAttach paymasterAndData to your UserOperation before signing.");
    }
}
