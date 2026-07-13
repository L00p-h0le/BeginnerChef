// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BeginnerChef} from "../src/BeginnerChef.sol";
import {MockA} from "../src/mocks/MockA.sol";
import {MockB} from "../src/mocks/MockB.sol";
import {MockC} from "../src/mocks/MockC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BeginnerChefTest is Test {
    BeginnerChef chef;
    MockA rewardToken;
    MockB stakedToken1;
    MockC stakedToken2;

    address alice = address(0x1);
    address bob = address(0x2);

    uint256 REWARD_PER_SECOND = 10 ether;

    function setUp() public {
        rewardToken = new MockA("Reward Token", "RWD");
        stakedToken1 = new MockB("Staked Token 1", "STK1");
        stakedToken2 = new MockC("Staked Token 2", "STK2");

        chef = new BeginnerChef(rewardToken, REWARD_PER_SECOND);

        // Mint reward tokens to chef so it can pay out
        rewardToken.mint(address(chef), 1_000_000 ether);

        // Mint staked tokens to users
        stakedToken1.mint(alice, 10_000 ether);
        stakedToken1.mint(bob, 10_000 ether);
        stakedToken2.mint(alice, 10_000 ether);
        stakedToken2.mint(bob, 10_000 ether);

        // Approve chef to spend staked tokens
        vm.startPrank(alice);
        stakedToken1.approve(address(chef), type(uint256).max);
        stakedToken2.approve(address(chef), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        stakedToken1.approve(address(chef), type(uint256).max);
        stakedToken2.approve(address(chef), type(uint256).max);
        vm.stopPrank();
    }

    function test_SingleStaker_FullDuration() public {
        chef.add(100, stakedToken1); // pid 0
        
        vm.prank(alice);
        chef.deposit(0, 100 ether);

        skip(100); // 100 seconds

        uint256 pending = chef.pendingRewards(0, alice);
        assertEq(pending, 1000 ether);
    }

    function test_TwoStakers_ProportionalSplit() public {
        chef.add(100, stakedToken1); // pid 0

        // t=0: Alice deposits 100
        vm.prank(alice);
        chef.deposit(0, 100 ether);

        // warp to t=10
        skip(10); 

        // t=10: Bob deposits 300
        vm.prank(bob);
        chef.deposit(0, 300 ether);

        // warp to t=20
        skip(10);

        uint256 pendingAlice = chef.pendingRewards(0, alice);
        uint256 pendingBob = chef.pendingRewards(0, bob);

        assertEq(pendingAlice, 125 ether);
        assertEq(pendingBob, 75 ether);
    }

    function test_MultiPool_AllocPointSplit() public {
        chef.add(300, stakedToken1); // pid 0
        chef.add(100, stakedToken2); // pid 1

        // Stake equally
        vm.startPrank(alice);
        chef.deposit(0, 100 ether);
        chef.deposit(1, 100 ether);
        vm.stopPrank();

        skip(100); // 100 seconds

        uint256 pendingPool0 = chef.pendingRewards(0, alice);
        uint256 pendingPool1 = chef.pendingRewards(1, alice);

        assertEq(pendingPool0, 750 ether);
        assertEq(pendingPool1, 250 ether);
    }

    function test_Set_MidStream_DoesNotRetroactivelyChangeRewards() public {
        chef.add(100, stakedToken1); // pid 0
        chef.add(100, stakedToken2); // pid 1

        vm.prank(alice);
        chef.deposit(0, 100 ether);

        skip(10); // 100 total rewards, pool 0 has 100/200 = 50% => 50 ether
        
        uint256 pendingBefore = chef.pendingRewards(0, alice);
        assertEq(pendingBefore, 50 ether);

        // Change alloc point to 300
        chef.set(0, 300);

        uint256 pendingAfterSet = chef.pendingRewards(0, alice);
        // Should not change retrospectively
        assertEq(pendingAfterSet, pendingBefore);

        skip(10); // 100 total rewards, pool 0 has 300/400 = 75% => 75 ether
        uint256 pendingFinal = chef.pendingRewards(0, alice);
        assertEq(pendingFinal, 50 ether + 75 ether);
    }

    function test_Deposit_ZeroTotalStaked_NoRewardsLost() public {
        chef.add(100, stakedToken1); // pid 0

        skip(100); // Nobody staked

        vm.prank(alice);
        chef.deposit(0, 100 ether);

        // Immediate check
        uint256 pendingImmediate = chef.pendingRewards(0, alice);
        assertEq(pendingImmediate, 0);

        skip(10); // 10 seconds of staking
        uint256 pendingLater = chef.pendingRewards(0, alice);
        assertEq(pendingLater, 100 ether);
    }

    function test_Withdraw_RevertsIfAmountExceedsStake() public {
        chef.add(100, stakedToken1); // pid 0
        
        vm.prank(alice);
        chef.deposit(0, 100 ether);

        vm.prank(alice);
        vm.expectRevert(BeginnerChef.Invalid_Amount.selector);
        chef.withdraw(0, 101 ether);
    }

    function test_Withdraw_HarvestsPendingRewardsCorrectly() public {
        chef.add(100, stakedToken1); // pid 0
        
        vm.prank(alice);
        chef.deposit(0, 100 ether);

        skip(10);

        uint256 pendingExpected = chef.pendingRewards(0, alice);
        assertEq(pendingExpected, 100 ether);

        uint256 balBefore = rewardToken.balanceOf(alice);
        
        vm.prank(alice);
        chef.withdraw(0, 50 ether); // Partial withdraw

        uint256 balAfter = rewardToken.balanceOf(alice);
        assertEq(balAfter - balBefore, pendingExpected);

        (uint256 stakedAmount, ) = chef.userInfo(0, alice);
        assertEq(stakedAmount, 50 ether);
    }

    function test_EmergencyWithdraw_ForfeitsRewards() public {
        chef.add(100, stakedToken1); // pid 0
        
        vm.prank(alice);
        chef.deposit(0, 100 ether);

        skip(10); // accrue rewards

        uint256 pendingExpected = chef.pendingRewards(0, alice);
        assert(pendingExpected > 0);

        uint256 rewardBalBefore = rewardToken.balanceOf(alice);
        uint256 stakedBalBefore = stakedToken1.balanceOf(alice);

        vm.prank(alice);
        chef.emergencyWithdraw(0);

        uint256 rewardBalAfter = rewardToken.balanceOf(alice);
        uint256 stakedBalAfter = stakedToken1.balanceOf(alice);

        // No rewards
        assertEq(rewardBalAfter, rewardBalBefore);
        // Staked returned
        assertEq(stakedBalAfter - stakedBalBefore, 100 ether);

        (uint256 stakedAmount, uint256 rewardDebt) = chef.userInfo(0, alice);
        assertEq(stakedAmount, 0);
        assertEq(rewardDebt, 0);
    }

    function test_Set_RevertsOnInvalidPid() public {
        // pid 0 doesn't exist
        vm.expectRevert();
        chef.set(0, 100);
    }

    function test_PendingRewards_ZeroWhenNoStake() public {
        chef.add(100, stakedToken1); // pid 0
        
        uint256 pending = chef.pendingRewards(0, bob);
        assertEq(pending, 0);
    }

    function testFuzz_Deposit_Withdraw_ReturnsExactAmount(uint256 amount) public {
        amount = bound(amount, 1, 10_000 ether);
        chef.add(100, stakedToken1); // pid 0

        uint256 balBefore = stakedToken1.balanceOf(alice);
        uint256 rewardBalBefore = rewardToken.balanceOf(alice);

        vm.startPrank(alice);
        chef.deposit(0, amount);
        skip(0);
        chef.withdraw(0, amount);
        vm.stopPrank();

        uint256 balAfter = stakedToken1.balanceOf(alice);
        uint256 rewardBalAfter = rewardToken.balanceOf(alice);

        assertEq(balAfter, balBefore);
        assertEq(rewardBalAfter, rewardBalBefore);
    }

    function testFuzz_PendingRewards_NeverExceedsFunded(uint256 amount, uint256 timeElapsed) public {
        amount = bound(amount, 1, 10_000 ether);
        timeElapsed = bound(timeElapsed, 1, 1000 days);

        chef.add(100, stakedToken1); // pid 0

        vm.prank(alice);
        chef.deposit(0, amount);

        skip(timeElapsed);

        uint256 pending = chef.pendingRewards(0, alice);
        
        uint256 maxPossible = timeElapsed * REWARD_PER_SECOND;

        assertLe(pending, maxPossible);
    }

    function testFuzz_MultiPool_AllocSplit_HoldsForAnyRatio(uint256 allocA, uint256 allocB, uint256 stakeAmount, uint256 timeElapsed) public {
        allocA = bound(allocA, 1, 10000);
        allocB = bound(allocB, 1, 10000);
        stakeAmount = bound(stakeAmount, 1, 10_000 ether);
        timeElapsed = bound(timeElapsed, 1, 1000 days);

        chef.add(allocA, stakedToken1); // pid 0
        chef.add(allocB, stakedToken2); // pid 1

        vm.startPrank(alice);
        chef.deposit(0, stakeAmount);
        chef.deposit(1, stakeAmount);
        vm.stopPrank();

        skip(timeElapsed);

        uint256 pendingA = chef.pendingRewards(0, alice);
        uint256 pendingB = chef.pendingRewards(1, alice);
        
        uint256 left = pendingA * allocB;
        uint256 right = pendingB * allocA;
        
        // 1e14 is 0.01% in standard representation, but assertApproxEqRel takes 1e18 as 100%
        // So 1e14 = 0.01% tolerance.
        assertApproxEqRel(left, right, 1e14);
    }
}
