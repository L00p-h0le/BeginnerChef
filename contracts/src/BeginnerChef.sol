// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { MockA } from "./mocks/MockA.sol";
import { MockB } from "./mocks/MockB.sol";
import { MockC } from "./mocks/MockC.sol";

contract BeginnerChef is Ownable{

    struct UserInfo{
        uint256 stakedAmount;
        uint256 rewardDebt;
    }

    struct PoolInfo{
        IERC20 stakingToken;
        uint256 allocpoint; // alloc points assigned to this pool . Reward tokens to distribute per block
        uint256 lastRewardTime; // the last block number at which the rewards were distributed
        uint256 accRewardPerToken; // accumulated reward per token
    }

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    uint256 public totalAllocPoint = 0;
    IERC20 public rewardToken;
    uint256 public rewardPerSecond;

    constructor(IERC20 _rewardToken , uint256 _rewardPerSecond) Ownable(msg.sender) {
        rewardToken = _rewardToken;
        rewardPerSecond = _rewardPerSecond;
    }

    function add() public {

    }

    function set() public {

    }

    function deposit() external {
        
    }

    function withdraw() external {

    }

    function updatePool() public {

    }

    function massUpdatePools() public {

    }

    function pendingRewards() external view {

    }

    function emergencyWithdraw() external {

    }

}   
