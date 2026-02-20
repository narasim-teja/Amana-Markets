// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {UserRegistry} from "../src/access/UserRegistry.sol";

contract DeployUserRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        UserRegistry userRegistry = new UserRegistry(deployer);
        console.log("UserRegistry:", address(userRegistry));

        vm.stopBroadcast();
    }
}
