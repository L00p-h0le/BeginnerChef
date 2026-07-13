// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { MockA } from "./mocks/MockA.sol";
import { MockB } from "./mocks/MockB.sol";
import { MockC } from "./mocks/MockC.sol";

contract BeginnerChef is Ownable , ReentrancyGuard{

    using SafeERC20 for IERC20;
    struct UserInfo{
        uint256 stakedAmount;
        uint256 rewardDebt;
    }

    struct PoolInfo{
        IERC20 stakedToken;
        uint256 allocpoint; // alloc points assigned to this pool . Reward tokens to distribute per block
        uint256 lastRewardTime; // the last block time at which the rewards were distributed
        uint256 accRewardPerToken; // accumulated reward per token
    }

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    uint256 public totalAllocPoint = 0;
    IERC20 public rewardToken;
    uint256 public rewardPerSecond;

    error Invalid_Amount();

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(IERC20 _rewardToken , uint256 _rewardPerSecond) Ownable(msg.sender) {
        rewardToken = _rewardToken;
        rewardPerSecond = _rewardPerSecond;
    }

    function add() public onlyOwner {  

    }

    function set() public onlyOwner {

    }

    function deposit(uint256 _pid , uint256 amount) external nonReentrant{

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 pendingReward;

        //Bring this pool's accumulator up to date FIRST
        updatePool(_pid);

        //If user already has a stake, pay out what they've earned so far
        // BEFORE touching their balance or rewardDebt

        if(user.stakedAmount > 0){
            pendingReward = (user.stakedAmount * pool.accRewardPerToken) / 1e12 - user.rewardDebt;   
        }

        // Pull the new tokens in from the user
        pool.stakedToken.transferFrom(msg.sender , address(this) , amount);

        // Update their staked amount
        user.stakedAmount += amount;

        // Reset their rewardDebt to reflect the NEW stakedAmount at the CURRENT accumulator
        user.rewardDebt = (user.stakedAmount * pool.accRewardPerToken) / 1e12;

        //pay pending rewards to the user at last ( Check -> Effects -> Interaction)
        rewardToken.safeTransfer( msg.sender , pendingReward);

        // Pull the new tokens in from the user
        pool.stakedToken.safeTransferFrom(msg.sender , address(this) , amount);

        // emit event
        emit Deposit(msg.sender , _pid , amount);

    }

    function withdraw(uint256 _pid , uint256 amount) external nonReentrant{

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        // Check: can they actually withdraw this much?

        if(amount > user.stakedAmount) revert Invalid_Amount();

        //Bring pool up to date first, same as deposit
        updatePool(_pid);

        // Calculate and pay out pending reward — same formula as deposit
        uint256 pendingReward = (user.stakedAmount * pool.accRewardPerToken) / 1e12 - user.rewardDebt;

        // Update state BEFORE any external calls (effects before interactions)
        user.stakedAmount -= amount;
        user.rewardDebt = (user.stakedAmount * pool.accRewardPerToken) / 1e12;

        // Now do the external calls — reward transfer AND staking token transfer back to user
       // (both go out, unlike deposit where one came in and one went out)

       rewardToken.safeTransfer( msg.sender , pendingReward);
       pool.stakedToken.safeTransfer( msg.sender , amount);

       //emit event
       emit Withdraw(msg.sender , _pid, amount);
    }

    function updatePool(uint256 _pid) public {

        PoolInfo storage pool = poolInfo[_pid];

         // Already up to date? nothing to do
        if(block.timestamp <= pool.lastRewardTime) return;

        // Get total staked in this pool
        uint256 poolTokens = pool.stakedToken.balanceOf(address(this));

        // Zero-staked guard(edge case)
        if(poolTokens == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        // Time elapsed
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;

        // This pool's share of total rewards over that time
        uint256 reward = timeElapsed * rewardPerSecond * pool.allocpoint / totalAllocPoint;

        // Update the accumulator, scaled by 1e12
        pool.accRewardPerToken += (reward * 1e12) / poolTokens;

        // Advance the clock
        pool.lastRewardTime = block.timestamp;

    }

    function massUpdatePools() public {

    }

    function pendingRewards() external view {

    }

    function emergencyWithdraw() external {

    }

}   
