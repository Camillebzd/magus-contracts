// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMaterial} from "./IMaterial.sol";

contract Material is IMaterial, ERC20, ERC20Burnable, Ownable, ERC20Permit {
    constructor(address initialOwner, string memory initialName, string memory initialSymbol)
        ERC20(initialName, initialSymbol)
        Ownable(initialOwner)
        ERC20Permit(initialName)
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) public override(ERC20Burnable, IMaterial) {
        super.burnFrom(account, amount);
    }
}