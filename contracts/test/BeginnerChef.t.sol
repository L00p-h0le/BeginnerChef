// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {BeginnerChef} from "../src/BeginnerChef.sol";
import {MockA} from "../src/mocks/MockA.sol";
import {MockB} from "../src/mocks/MockB.sol";
import {MockC} from "../src/mocks/MockC.sol";
import {MockFeeOnTransfer} from "../src/mocks/MockFeeOnTransfer.sol";
import {MockMalicious} from "../src/mocks/MockMalicious.sol";
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

    function test_Reentrancy_BlocksMaliciousToken() public {
        MockMalicious maliciousToken = new MockMalicious("Malicious", "MAL");
        chef.add(100, maliciousToken);
        uint256 pid = 0;

        maliciousToken.mint(alice, 1000 ether);
        vm.prank(alice);
        maliciousToken.approve(address(chef), type(uint256).max);

        // configure malicious token to reenter deposit
        maliciousToken.setChef(address(chef), pid, true);

        vm.prank(alice);
        vm.expectRevert(); // Should revert due to ReentrancyGuard
        chef.deposit(pid, 100 ether);
    }

    function test_FeeOnTransfer_MismatchedAccounting() public {
        MockFeeOnTransfer fotToken = new MockFeeOnTransfer("FOT", "FOT");
        chef.add(100, fotToken);
        uint256 pid = 0;

        fotToken.mint(alice, 100 ether);
        fotToken.mint(bob, 100 ether);
        
        vm.prank(alice);
        fotToken.approve(address(chef), type(uint256).max);

        vm.prank(bob);
        fotToken.approve(address(chef), type(uint256).max);

        // Alice deposits 100 ether. FOT token burns 10%, contract receives 90 ether.
        vm.prank(alice);
        chef.deposit(pid, 100 ether);

        // Alice's stakedAmount is 100, but contract only received 90.
        (uint256 stakedAmountAlice, ) = chef.userInfo(pid, alice);
        assertEq(stakedAmountAlice, 100 ether);
        assertEq(fotToken.balanceOf(address(chef)), 90 ether);

        // Bob deposits 100 ether, contract receives another 90 ether.
        // Total contract balance = 180 ether.
        vm.prank(bob);
        chef.deposit(pid, 100 ether);

        // Alice withdraws 100 ether (which she is credited for).
        // Since contract has 180 ether, this succeeds, stealing Bob's tokens!
        vm.prank(alice);
        chef.withdraw(pid, 100 ether);

        // Bob is now left with only 80 ether in the contract, despite staking 100.
        assertEq(fotToken.balanceOf(address(chef)), 80 ether);

        // Bob tries to withdraw his 100 ether, but contract only has 80.
        // Reverts due to ERC20 insufficient balance.
        vm.prank(bob);
        vm.expectRevert();
        chef.withdraw(pid, 100 ether);
    }

    function test_DonationAttack_DilutesRewards() public {
        chef.add(100, stakedToken1);
        uint256 pid = 0;

        // Bob deposits 100 normally
        vm.prank(bob);
        chef.deposit(pid, 100 ether);

        // Alice (attacker) donates 900 ether directly to the contract (bypassing deposit)
        vm.prank(alice);
        stakedToken1.transfer(address(chef), 900 ether);

        // Fast forward 10 seconds.
        // In 10 seconds, 100 ether rewards are accrued to this pool.
        skip(10);
        
        // Because Alice donated 900 ether, the pool's token balance is 1000 ether.
        // The accRewardPerToken formula uses token balance as the denominator.
        // So the reward rate is diluted 10x!
        uint256 bobPending = chef.pendingRewards(pid, bob);
        
        // Bob gets only 10 ether (100 * 100 / 1000) instead of the 100 ether he deserves.
        assertEq(bobPending, 10 ether);
    }

    function test_RoundingPrecisionDust() public {
        chef.add(100, stakedToken1);
        uint256 pid = 0;

        // Mint a lot of tokens to Bob to inflate lpSupply
        stakedToken1.mint(bob, 10_000_000 ether);
        vm.prank(bob);
        stakedToken1.approve(address(chef), type(uint256).max);

        // Bob deposits a massive amount
        vm.prank(bob);
        chef.deposit(pid, 10_000_000 ether);

        // Alice stakes just 1 wei
        vm.prank(alice);
        chef.deposit(pid, 1);

        // Fast forward 10 seconds (100 ether reward)
        skip(10);
        
        // Because Alice's stake is so tiny compared to lpSupply, her reward rounds down to 0 safely.
        uint256 alicePending = chef.pendingRewards(pid, alice);
        assertEq(alicePending, 0);
    }
}
