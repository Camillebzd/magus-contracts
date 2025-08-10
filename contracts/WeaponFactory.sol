// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WeaponTypes} from "./WeaponTypes.sol";

contract WeaponFactory is Ownable {
    using WeaponTypes for WeaponTypes.WeaponData;

    // Mapping from weapon type to base weapon template
    mapping(WeaponTypes.WeaponType => WeaponTypes.WeaponData)
        private _weaponTemplates;

    // Array to track which weapon types have been configured
    WeaponTypes.WeaponType[] private _configuredWeaponTypes;

    // Mapping to check if a weapon type is configured
    mapping(WeaponTypes.WeaponType => bool) private _isWeaponTypeConfigured;

    event WeaponTemplateAdded(
        WeaponTypes.WeaponType indexed weaponType,
        string name
    );
    event WeaponTemplateUpdated(
        WeaponTypes.WeaponType indexed weaponType,
        string name
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Add or update a weapon template (only owner)
     */
    function setWeaponTemplate(
        WeaponTypes.WeaponType weaponType,
        string memory name,
        string memory description,
        string memory image,
        WeaponTypes.WeaponStats memory stats,
        string[] memory abilities
    ) external onlyOwner {
        bool isUpdate = _isWeaponTypeConfigured[weaponType];

        _setWeaponTemplate(
            weaponType,
            name,
            description,
            image,
            stats,
            abilities
        );

        if (isUpdate) {
            emit WeaponTemplateUpdated(weaponType, name);
        } else {
            emit WeaponTemplateAdded(weaponType, name);
        }
    }

    /**
     * @dev Internal function to set weapon template
     */
    function _setWeaponTemplate(
        WeaponTypes.WeaponType weaponType,
        string memory name,
        string memory description,
        string memory image,
        WeaponTypes.WeaponStats memory stats,
        string[] memory abilities
    ) private {
        _weaponTemplates[weaponType] = WeaponTypes.WeaponData({
            name: name,
            description: description,
            image: image,
            level: 1,
            tier: 1,
            weaponType: weaponType,
            weaponStats: stats,
            xp: 0,
            abilities: abilities
        });

        if (!_isWeaponTypeConfigured[weaponType]) {
            _configuredWeaponTypes.push(weaponType);
            _isWeaponTypeConfigured[weaponType] = true;
        }
    }

    /**
     * @dev Get base weapon data for a specific weapon type
     */
    function getWeaponTemplate(
        WeaponTypes.WeaponType weaponType
    ) external view returns (WeaponTypes.WeaponData memory) {
        require(
            _isWeaponTypeConfigured[weaponType],
            "WeaponFactory: Weapon type not configured"
        );
        return _weaponTemplates[weaponType];
    }

    /**
     * @dev Create a new weapon instance from template
     */
    function createWeapon(
        WeaponTypes.WeaponType weaponType
    ) external view returns (WeaponTypes.WeaponData memory) {
        require(
            _isWeaponTypeConfigured[weaponType],
            "WeaponFactory: Weapon type not configured"
        );
        return _weaponTemplates[weaponType];
    }

    /**
     * @dev Get all configured weapon types
     */
    function getConfiguredWeaponTypes()
        external
        view
        returns (WeaponTypes.WeaponType[] memory)
    {
        return _configuredWeaponTypes;
    }

    /**
     * @dev Check if a weapon type is configured
     */
    function isWeaponTypeConfigured(
        WeaponTypes.WeaponType weaponType
    ) external view returns (bool) {
        return _isWeaponTypeConfigured[weaponType];
    }

    /**
     * @dev Get the total number of configured weapon types
     */
    function getWeaponTypeCount() external view returns (uint256) {
        return _configuredWeaponTypes.length;
    }
}
