// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BeginnerChef} from "../src/BeginnerChef.sol";
import {MockA} from "../src/mocks/MockA.sol";
import {MockB} from "../src/mocks/MockB.sol";
import {MockC} from "../src/mocks/MockC.sol";

contract Deploy is Script {
    // Well-known Anvil default account #0 — safe to hardcode, holds no real funds
    uint256 constant ANVIL_DEFAULT_KEY =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", ANVIL_DEFAULT_KEY);
        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deploying with address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MockA rewardToken = new MockA("Reward Token", "RWD");
        MockB stakedToken1 = new MockB("Staked Token 1", "STK1");
        MockC stakedToken2 = new MockC("Staked Token 2", "STK2");

        uint256 rewardPerSecond = 10 ether;
        BeginnerChef chef = new BeginnerChef(rewardToken, rewardPerSecond);

        uint256 initialFunding = 1_000_000 ether;
        rewardToken.mint(address(chef), initialFunding);

        chef.add(100, stakedToken1); // pid 0
        chef.add(50, stakedToken2);  // pid 1

        stakedToken1.mint(deployerAddress, 10_000 ether);
        stakedToken2.mint(deployerAddress, 10_000 ether);

        vm.stopBroadcast();

        console.log("--- Deployment Summary ---");
        console.log("Reward Token:", address(rewardToken));
        console.log("Staked Token 1:", address(stakedToken1));
        console.log("Staked Token 2:", address(stakedToken2));
        console.log("BeginnerChef:", address(chef));
        console.log("Pool 0 (STK1) allocPoint: 100");
        console.log("Pool 1 (STK2) allocPoint: 50");
        console.log("Reward token pre-funded (ether units):", initialFunding / 1 ether);
    }
}