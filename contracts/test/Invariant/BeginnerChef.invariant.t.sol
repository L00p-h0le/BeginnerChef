// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {BeginnerChef} from "../../src/BeginnerChef.sol";
import {MockA} from "../../src/mocks/MockA.sol";
import {MockB} from "../../src/mocks/MockB.sol";
import {MockC} from "../../src/mocks/MockC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Handler is Test {
    BeginnerChef chef;
    MockA rewardToken;
    MockB stakedToken1;
    MockC stakedToken2;

    uint256 public constant REWARD_PER_SECOND = 10 ether;
    uint256 public constant TOTAL_MINTED = 10_000_000 ether;

    uint256 public totalPaidOut;
    
    // Ghost variables for invariants
    mapping(uint256 => uint256) public lastAccRewardPerToken;
    
    // Track users and pools
    address[] public users;
    uint256 public poolCount;

    // For Invariant 3
    uint256 public lastWarpTime;
    mapping(uint256 => uint256) public accAtLastWarp;
    bool public hasSetCallSinceWarp;

    constructor(
        BeginnerChef _chef, 
        MockA _rewardToken, 
        MockB _stakedToken1, 
        MockC _stakedToken2
    ) {
        chef = _chef;
        rewardToken = _rewardToken;
        stakedToken1 = _stakedToken1;
        stakedToken2 = _stakedToken2;

        users.push(address(0x1));
        users.push(address(0x2));
        users.push(address(0x3));

        for(uint i = 0; i < users.length; i++) {
            stakedToken1.mint(users[i], 1_000_000 ether);
            stakedToken2.mint(users[i], 1_000_000 ether);
            
            vm.startPrank(users[i]);
            stakedToken1.approve(address(chef), type(uint256).max);
            stakedToken2.approve(address(chef), type(uint256).max);
            vm.stopPrank();
        }

        lastWarpTime = block.timestamp;
    }

    modifier recordAcc() {
        _;
        for(uint256 i = 0; i < poolCount; i++) {
            (, , , uint256 acc) = chef.poolInfo(i);
            require(acc >= lastAccRewardPerToken[i], "Acc decreased!");
            lastAccRewardPerToken[i] = acc;
        }
    }

    function addPool(uint256 allocPoint, bool useToken1) public recordAcc {
        if (poolCount >= 10) return; // cap total pools to keep runtime sane
        allocPoint = bound(allocPoint, 1, 10000);
        IERC20 token = useToken1 ? IERC20(stakedToken1) : IERC20(stakedToken2);
        chef.add(allocPoint, token);
        poolCount++;
        hasSetCallSinceWarp = true;
    }

    function setPool(uint256 pid, uint256 allocPoint) public recordAcc {
        if (poolCount == 0) return;
        pid = pid % poolCount;
        allocPoint = bound(allocPoint, 1, 10000);
        chef.set(pid, allocPoint);
        hasSetCallSinceWarp = true;
    }

    function deposit(uint256 userIndex, uint256 pid, uint256 amount) public recordAcc {
        if (poolCount == 0) return;
        pid = pid % poolCount;
        address user = users[userIndex % users.length];
        
        (IERC20 token, , , ) = chef.poolInfo(pid);
        amount = bound(amount, 0, token.balanceOf(user));
        
        uint256 balBefore = rewardToken.balanceOf(user);
        
        vm.prank(user);
        chef.deposit(pid, amount);

        uint256 balAfter = rewardToken.balanceOf(user);
        totalPaidOut += (balAfter - balBefore);
    }

    function withdraw(uint256 userIndex, uint256 pid, uint256 amount) public recordAcc {
        if (poolCount == 0) return;
        pid = pid % poolCount;
        address user = users[userIndex % users.length];
        
        (uint256 stakedAmount, ) = chef.userInfo(pid, user);
        if (stakedAmount == 0) return;
        
        amount = bound(amount, 0, stakedAmount);

        uint256 balBefore = rewardToken.balanceOf(user);
        
        vm.prank(user);
        chef.withdraw(pid, amount);

        uint256 balAfter = rewardToken.balanceOf(user);
        totalPaidOut += (balAfter - balBefore);
    }
    
    function emergencyWithdraw(uint256 userIndex, uint256 pid) public recordAcc {
        if (poolCount == 0) return;
        pid = pid % poolCount;
        address user = users[userIndex % users.length];

        (uint256 stakedAmount, ) = chef.userInfo(pid, user);
        if (stakedAmount == 0) return;

        vm.prank(user);
        chef.emergencyWithdraw(pid);
    }

    function warp(uint256 timeElapsed) public recordAcc {
        uint256 currentT = block.timestamp;
        uint256 maxWarp = 900_000 > currentT ? 900_000 - currentT : 0;
        if (maxWarp == 0) return;
        
        timeElapsed = bound(timeElapsed, 1, maxWarp);
        
        // Before warping, record snapshot if we want to check allocation
        if (!hasSetCallSinceWarp) {
            // We could assert here, but standard invariant tests are called externally.
        }

        vm.warp(block.timestamp + timeElapsed);

        hasSetCallSinceWarp = false;
        lastWarpTime = block.timestamp;
        
        for(uint256 i = 0; i < poolCount; i++) {
            (, , , uint256 acc) = chef.poolInfo(i);
            accAtLastWarp[i] = acc;
        }
    }

    function getUsers() public view returns (address[] memory) {
        return users;
    }
}

contract BeginnerChefInvariantTest is StdInvariant, Test {
    BeginnerChef chef;
    MockA rewardToken;
    MockB stakedToken1;
    MockC stakedToken2;
    Handler handler;

    function setUp() public {
        rewardToken = new MockA("Reward Token", "RWD");
        stakedToken1 = new MockB("Staked Token 1", "STK1");
        stakedToken2 = new MockC("Staked Token 2", "STK2");

        chef = new BeginnerChef(rewardToken, 10 ether);

        // Mint reward tokens to chef
        rewardToken.mint(address(chef), 10_000_000 ether);

        handler = new Handler(chef, rewardToken, stakedToken1, stakedToken2);
        chef.transferOwnership(address(handler));

        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = handler.addPool.selector;
        selectors[1] = handler.setPool.selector;
        selectors[2] = handler.deposit.selector;
        selectors[3] = handler.withdraw.selector;
        selectors[4] = handler.emergencyWithdraw.selector;
        selectors[5] = handler.warp.selector;

        targetSelector(FuzzSelector({
            addr: address(handler),
            selectors: selectors
        }));
        targetContract(address(handler));
    }

    // Invariant 1 — Conservation:
    // sum of all users' pendingRewards() across all pools + total reward tokens already paid out ≤ total reward tokens ever minted/funded into the contract
    function invariant_Conservation() public view{
        uint256 totalPending = 0;
        uint256 poolCount = handler.poolCount();
        address[] memory users = handler.getUsers();

        for (uint256 p = 0; p < poolCount; p++) {
            for (uint256 u = 0; u < users.length; u++) {
                totalPending += chef.pendingRewards(p, users[u]);
            }
        }

        uint256 totalPaidOut = handler.totalPaidOut();
        uint256 totalFunded = handler.TOTAL_MINTED();

        assertLe(totalPending + totalPaidOut, totalFunded);
    }

    // Invariant 2 — Accumulator monotonicity:
    // accRewardPerToken for any given pool never decreases, across any sequence of calls.
    function invariant_AccumulatorMonotonicity() public view{
        uint256 poolCount = handler.poolCount();
        for (uint256 p = 0; p < poolCount; p++) {
            (, , , uint256 acc) = chef.poolInfo(p);
            uint256 lastAcc = handler.lastAccRewardPerToken(p);
            assertGe(acc, lastAcc);
        }
    }

    // Invariant 3 — Allocation correctness:
    // Over any period with no set() calls, each pool's share of newly accrued rewards matches its allocPoint / totalAllocPoint ratio within rounding tolerance.
    function invariant_AllocationCorrectness() public view{
        if (handler.hasSetCallSinceWarp()) return;
        
        uint256 poolCount = handler.poolCount();
        if (poolCount < 2) return;
        
        uint256 totalAlloc = chef.totalAllocPoint();
        if (totalAlloc == 0) return;

        uint256 totalTime = block.timestamp - handler.lastWarpTime();
        if (totalTime == 0) return;

        for (uint256 p = 0; p < poolCount; p++) {
            (, uint256 allocPoint, , uint256 currentAcc) = chef.poolInfo(p);
            (IERC20 token, , , ) = chef.poolInfo(p);
            
            uint256 poolTokens = token.balanceOf(address(chef));
            if (poolTokens == 0) continue;

            uint256 startAcc = handler.accAtLastWarp(p);
            uint256 accDelta = currentAcc - startAcc;
            
            uint256 actualReward = (accDelta * poolTokens) / 1e12;
            uint256 expectedReward = (totalTime * handler.REWARD_PER_SECOND() * allocPoint) / totalAlloc;

            // Give a tolerance of 1 ether for rounding precision differences in divisions
            assertApproxEqAbs(actualReward, expectedReward, 1 ether);
        }
    }
}
