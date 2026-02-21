// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {ADINativePaymaster} from "../../src/paymaster/ADINativePaymaster.sol";
import {ADIErc20Paymaster} from "../../src/paymaster/ADIErc20Paymaster.sol";

/// @title ConfigureSponsor
/// @notice CLI script to update the sponsor signer on both paymasters.
/// @dev Usage: forge script ConfigureSponsor --sig "run(address)" <newSignerAddr> -f adi_testnet --broadcast
contract ConfigureSponsor is Script {
    function run(address newSigner) external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        ADINativePaymaster nativePaymaster = ADINativePaymaster(payable(vm.envAddress("NATIVE_PAYMASTER")));
        ADIErc20Paymaster erc20Paymaster = ADIErc20Paymaster(payable(vm.envAddress("ERC20_PAYMASTER")));

        console.log("=== Configure Sponsor Signer ===");
        console.log("New Signer:", newSigner);
        console.log("Native Paymaster:", address(nativePaymaster));
        console.log("ERC20 Paymaster: ", address(erc20Paymaster));

        vm.startBroadcast(deployerKey);

        nativePaymaster.setSponsorSigner(newSigner);
        console.log("  Native paymaster signer updated");

        erc20Paymaster.setSponsorSigner(newSigner);
        console.log("  ERC20 paymaster signer updated");

        vm.stopBroadcast();

        console.log("\n=== Done ===");
    }
}
