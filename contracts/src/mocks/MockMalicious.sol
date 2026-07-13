// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IBeginnerChef {
    function deposit(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
}

contract MockMalicious is ERC20 {
    IBeginnerChef public chef;
    uint256 public pid;
    bool public isDeposit;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function setChef(address _chef, uint256 _pid, bool _isDeposit) public {
        chef = IBeginnerChef(_chef);
        pid = _pid;
        isDeposit = _isDeposit;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool success = super.transferFrom(from, to, amount);
        
        // When transferring to the chef, try to reenter
        if (address(chef) != address(0) && to == address(chef)) {
            if (isDeposit) {
                chef.deposit(pid, 0); // try to deposit again
            } else {
                chef.withdraw(pid, 0); // try to withdraw
            }
        }
        
        return success;
    }
}
