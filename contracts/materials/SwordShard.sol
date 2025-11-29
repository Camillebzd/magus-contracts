// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Material} from "./Material.sol";

contract SwordShard is Material {
    constructor(address initialOwner)
        Material(initialOwner, "SwordShard", "SWSH")
    {}
}