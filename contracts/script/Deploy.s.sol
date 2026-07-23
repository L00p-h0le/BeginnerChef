// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BeginnerChef} from "../src/BeginnerChef.sol";
import {MockETH} from "../src/mocks/MockETH.sol";
import {MockSOL} from "../src/mocks/MockSOL.sol";
import {MockBTC} from "../src/mocks/MockBTC.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockRWD} from "../src/mocks/MockRWD.sol";

contract Deploy is Script {
    // Well-known Anvil default account #0 — safe to hardcode, holds no real funds
    uint256 constant ANVIL_DEFAULT_KEY =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", ANVIL_DEFAULT_KEY);
        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deploying with address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MockRWD rewardToken = new MockRWD("Reward Token", "RWD");
        MockETH stakedToken1 = new MockETH("mETH", "mETH");
        MockUSDC stakedToken2 = new MockUSDC("mUSDC", "mUSDC");
        MockBTC stakedToken3 = new MockBTC("mBTC" , "mBTC");
        MockSOL stakedToken4 = new MockSOL("mSOL" , "mSOL");

        uint256 rewardPerSecond = 0.2 ether;
        BeginnerChef chef = new BeginnerChef(rewardToken, rewardPerSecond);

        uint256 initialFunding = 4_000_000 ether;
        rewardToken.mint(address(chef), initialFunding);

        chef.add(100, stakedToken1); // pid 0
        chef.add(50, stakedToken2);  // pid 1

        stakedToken1.mint(deployerAddress, 10_000 ether);
        stakedToken2.mint(deployerAddress, 10_000 ether);
        stakedToken3.mint(deployerAddress, 10_000 ether);
        stakedToken4.mint(deployerAddress, 10_000 ether);

        vm.stopBroadcast();

        console.log("--- Deployment Summary ---");
        console.log("Reward Token:", address(rewardToken));
        console.log("Staked Token 1:", address(stakedToken1));
        console.log("Staked Token 2:", address(stakedToken2));
        console.log("Staked Token 3:", address(stakedToken3));
        console.log("Staked Token 4:", address(stakedToken4));
        console.log("BeginnerChef:", address(chef));
        console.log("Pool 0 (STK1) allocPoint: 100");
        console.log("Pool 1 (STK2) allocPoint: 75");
        console.log("Pool 2 (STK3) allocPoint: 50");
        console.log("Pool 3 (STK4) allocPoint: 25");
        console.log("Reward token pre-funded (ether units):", initialFunding / 1 ether);
    }
}