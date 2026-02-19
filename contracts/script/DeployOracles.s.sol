// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {AssetIds} from "../src/libraries/AssetIds.sol";
import {PythAdapter} from "../src/oracle/adapters/PythAdapter.sol";
import {DIAAdapter} from "../src/oracle/adapters/DIAAdapter.sol";
import {RedStoneAdapter} from "../src/oracle/adapters/RedStoneAdapter.sol";
import {ManualOracleAdapter} from "../src/oracle/adapters/ManualOracleAdapter.sol";
import {OracleRouter} from "../src/oracle/OracleRouter.sol";

contract DeployOracles is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy adapters
        PythAdapter pythAdapter = new PythAdapter(deployer);
        DIAAdapter diaAdapter = new DIAAdapter(deployer);
        RedStoneAdapter redStoneAdapter = new RedStoneAdapter(deployer);
        ManualOracleAdapter manualAdapter = new ManualOracleAdapter(deployer);

        // 2. Deploy router
        OracleRouter router = new OracleRouter(deployer);

        // 3. Register adapters with router
        router.addAdapter(address(pythAdapter));
        router.addAdapter(address(diaAdapter));
        router.addAdapter(address(redStoneAdapter));
        router.addAdapter(address(manualAdapter));

        // 4. Add relayer address (defaults to deployer if RELAYER_ADDRESS not set)
        address relayer = vm.envOr("RELAYER_ADDRESS", deployer);
        pythAdapter.addRelayer(relayer);
        diaAdapter.addRelayer(relayer);
        redStoneAdapter.addRelayer(relayer);

        // 5. Push initial test prices via ManualOracleAdapter
        manualAdapter.updatePrice(AssetIds.GOLD, 265000000000, block.timestamp); // $2,650.00
        manualAdapter.updatePrice(AssetIds.SILVER, 3150000000, block.timestamp); // $31.50
        manualAdapter.updatePrice(AssetIds.OIL, 7200000000, block.timestamp); // $72.00

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("=== Oracle Deployment ===");
        console.log("PythAdapter:         ", address(pythAdapter));
        console.log("DIAAdapter:          ", address(diaAdapter));
        console.log("RedStoneAdapter:     ", address(redStoneAdapter));
        console.log("ManualOracleAdapter: ", address(manualAdapter));
        console.log("OracleRouter:        ", address(router));
        console.log("Relayer:             ", relayer);
    }
}
