// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {AssetIds} from "../../src/libraries/AssetIds.sol";
import {IOracleAdapter} from "../../src/oracle/interfaces/IOracleAdapter.sol";
import {PythAdapter} from "../../src/oracle/adapters/PythAdapter.sol";
import {DIAAdapter} from "../../src/oracle/adapters/DIAAdapter.sol";
import {RedStoneAdapter} from "../../src/oracle/adapters/RedStoneAdapter.sol";
import {ManualOracleAdapter} from "../../src/oracle/adapters/ManualOracleAdapter.sol";
import {OracleRouter} from "../../src/oracle/OracleRouter.sol";

abstract contract TestSetup is Test {
    // --- Actors ---
    address public admin = makeAddr("admin");
    address public relayer1 = makeAddr("relayer1");
    address public relayer2 = makeAddr("relayer2");
    address public unauthorized = makeAddr("unauthorized");

    // --- Contracts ---
    PythAdapter public pythAdapter;
    DIAAdapter public diaAdapter;
    RedStoneAdapter public redStoneAdapter;
    ManualOracleAdapter public manualAdapter;
    OracleRouter public router;

    // --- Price constants (8 decimals) ---
    uint256 public constant GOLD_PRICE = 265000000000; // $2,650.00
    uint256 public constant SILVER_PRICE = 3150000000; // $31.50
    uint256 public constant OIL_PRICE = 7200000000; // $72.00

    function setUp() public virtual {
        vm.startPrank(admin);

        // Deploy adapters
        pythAdapter = new PythAdapter(admin);
        diaAdapter = new DIAAdapter(admin);
        redStoneAdapter = new RedStoneAdapter(admin);
        manualAdapter = new ManualOracleAdapter(admin);

        // Deploy router
        router = new OracleRouter(admin);

        // Register adapters with router
        router.addAdapter(address(pythAdapter));
        router.addAdapter(address(diaAdapter));
        router.addAdapter(address(redStoneAdapter));
        router.addAdapter(address(manualAdapter));

        // Add relayers to relayed adapters
        pythAdapter.addRelayer(relayer1);
        diaAdapter.addRelayer(relayer1);
        redStoneAdapter.addRelayer(relayer1);

        vm.stopPrank();
    }
}
