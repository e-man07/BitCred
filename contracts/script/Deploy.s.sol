// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MatchupMarket} from "../src/MatchupMarket.sol";

contract Deploy is Script {
    function run() external returns (MatchupMarket) {
        uint256 pk = vm.envUint("SOMNIA_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        // resolver == deployer for now; can be rotated later with setResolver.
        MatchupMarket market = new MatchupMarket(deployer);
        vm.stopBroadcast();

        console.log("MatchupMarket deployed at:", address(market));
        console.log("owner/resolver:", deployer);
        return market;
    }
}
