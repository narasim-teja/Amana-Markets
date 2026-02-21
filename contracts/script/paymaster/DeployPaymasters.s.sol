// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {EntryPoint} from "@account-abstraction/core/EntryPoint.sol";
import {SimpleAccountFactory} from "@account-abstraction/samples/SimpleAccountFactory.sol";
import {ADINativePaymaster} from "../../src/paymaster/ADINativePaymaster.sol";
import {ADIErc20Paymaster} from "../../src/paymaster/ADIErc20Paymaster.sol";
import {MockDirham} from "../../src/tokens/MockDirham.sol";

/// @title DeployPaymasters
/// @notice Deploys EntryPoint (if needed), both paymasters, and SimpleAccountFactory on ADI testnet.
/// @dev Usage: forge script DeployPaymasters -f adi_testnet --broadcast
contract DeployPaymasters is Script {
    // ERC-4337 EntryPoint addresses on ADI Testnet (per docs.adi.foundation)
    // v0.7: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
    // v0.8: 0x4337084d9e255ff0702461cf8895ce9e3b5ff108
    address constant EXPECTED_ENTRYPOINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address sponsorSigner = vm.envOr("SPONSOR_SIGNER", deployer);
        address mockDirham = vm.envAddress("MOCK_DIRHAM");

        console.log("=== ADI Paymaster Deployment ===");
        console.log("Deployer:       ", deployer);
        console.log("Sponsor Signer: ", sponsorSigner);
        console.log("MockDirham:     ", mockDirham);

        vm.startBroadcast(deployerKey);

        // --- EntryPoint ---
        IEntryPoint entryPoint;
        if (EXPECTED_ENTRYPOINT.code.length > 0) {
            console.log("\nEntryPoint already deployed at:", EXPECTED_ENTRYPOINT);
            entryPoint = IEntryPoint(EXPECTED_ENTRYPOINT);
        } else {
            console.log("\nDeploying new EntryPoint...");
            EntryPoint ep = new EntryPoint();
            entryPoint = IEntryPoint(address(ep));
            console.log("EntryPoint:     ", address(entryPoint));
        }

        // --- SimpleAccountFactory ---
        SimpleAccountFactory factory = new SimpleAccountFactory(entryPoint);
        console.log("AccountFactory: ", address(factory));

        // --- Native Paymaster ---
        uint256 defaultSpendCap = 10 ether; // 10 ADI per account
        ADINativePaymaster nativePaymaster = new ADINativePaymaster(
            entryPoint,
            sponsorSigner,
            defaultSpendCap
        );
        // Deposit native tokens and stake
        nativePaymaster.deposit{value: 1 ether}();
        nativePaymaster.addStake{value: 0.1 ether}(86400); // 1 day unstake delay
        console.log("\nNativePaymaster:", address(nativePaymaster));
        console.log("  Deposit:      ", nativePaymaster.getDeposit());

        // --- ERC20 Paymaster ---
        uint256 nativeToTokenRate = 3_670000; // 3.67 DDSC per ADI (DDSC has 6 decimals)
        uint256 priceMarkup = 110; // 10% markup
        uint256 erc20SpendCap = 1000_000000; // 1000 DDSC per account
        ADIErc20Paymaster erc20Paymaster = new ADIErc20Paymaster(
            entryPoint,
            MockDirham(mockDirham),
            6,
            sponsorSigner,
            nativeToTokenRate,
            priceMarkup,
            erc20SpendCap
        );
        erc20Paymaster.deposit{value: 1 ether}();
        erc20Paymaster.addStake{value: 0.1 ether}(86400);
        console.log("ERC20Paymaster: ", address(erc20Paymaster));
        console.log("  Deposit:      ", erc20Paymaster.getDeposit());
        console.log("  Rate:          3.67 DDSC/ADI");
        console.log("  Markup:        10%");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("\nAdd to .env:");
        console.log("ENTRYPOINT=", address(entryPoint));
        console.log("SIMPLE_ACCOUNT_FACTORY=", address(factory));
        console.log("NATIVE_PAYMASTER=", address(nativePaymaster));
        console.log("ERC20_PAYMASTER=", address(erc20Paymaster));
    }
}
