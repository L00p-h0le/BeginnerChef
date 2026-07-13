// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockFeeOnTransfer is ERC20 {
    uint256 public constant FEE_PERCENT = 10;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * FEE_PERCENT) / 100;
        bool success = super.transfer(to, amount);
        if (success) {
            _burn(to, fee);
        }
        return success;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * FEE_PERCENT) / 100;
        bool success = super.transferFrom(from, to, amount);
        if (success) {
            _burn(to, fee);
        }
        return success;
    }
}
