// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";

/// @notice Minimal contract to verify ADI Chain deployment works before deploying the full oracle suite.
contract SmokeTestContract {
    string public greeting;
    uint256 public value;

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function setValue(uint256 _value) external {
        value = _value;
    }
}

contract SmokeTest is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        SmokeTestContract smoke = new SmokeTestContract("Hello ADI Chain");
        smoke.setValue(42);

        vm.stopBroadcast();

        console.log("=== Smoke Test ===");
        console.log("Deployed at:", address(smoke));
        console.log("Greeting:", smoke.greeting());
        console.log("Value:", smoke.value());
    }
}
