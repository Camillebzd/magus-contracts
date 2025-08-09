// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {WeaponTypes} from "./WeaponTypes.sol";

library WeaponMetadata {
    using Strings for uint256;
    using Strings for uint16;

    /**
     * @dev Generates the complete tokenURI with base64 encoded JSON metadata
     */
    function generateTokenURI(WeaponTypes.WeaponData memory weapon) internal pure returns (string memory) {
        string memory json = generateJSON(weapon);
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    /**
     * @dev Generates the JSON metadata for a weapon
     */
    function generateJSON(WeaponTypes.WeaponData memory weapon) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                "{",
                '"name":"', weapon.name, '",',
                '"description":"', weapon.description, '",',
                '"image":"', weapon.image, '",',
                '"attributes":[',
                _generateAttributes(weapon),
                "]}"
            )
        );
    }

    /**
     * @dev Generates the attributes array for the JSON metadata
     */
    function _generateAttributes(WeaponTypes.WeaponData memory weapon) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                _generateBasicAttributes(weapon),
                ",",
                _generateStatsAttributes(weapon.weaponStats),
                ",",
                _generateAbilitiesAttribute(weapon.abilities)
            )
        );
    }

    /**
     * @dev Generates basic weapon attributes (level, stage, xp)
     */
    function _generateBasicAttributes(WeaponTypes.WeaponData memory weapon) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"trait_type":"Level","value":', weapon.level.toString(), '},',
                '{"trait_type":"Stage","value":', weapon.stage.toString(), '},',
                '{"trait_type":"XP","value":', weapon.xp.toString(), '},',
                '{"trait_type":"Weapon Type","value":"', _weaponTypeToString(weapon.weaponType), '"}'
            )
        );
    }

    /**
     * @dev Generates weapon stats attributes
     */
    function _generateStatsAttributes(WeaponTypes.WeaponStats memory stats) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"trait_type":"Health","value":', stats.health.toString(), '},',
                '{"trait_type":"Speed","value":', stats.speed.toString(), '},',
                '{"trait_type":"Mind","value":', stats.mind.toString(), '},',
                '{"trait_type":"Handling","value":', stats.handling.toString(), '},',
                _generateOffensiveStatsAttributes(stats.offensiveStats),
                ",",
                _generateDefensiveStatsAttributes(stats.defensiveStats)
            )
        );
    }

    /**
     * @dev Generates offensive stats attributes
     */
    function _generateOffensiveStatsAttributes(WeaponTypes.OffensiveStats memory offensive) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"trait_type":"Sharp Damage","value":', offensive.sharpDamage.toString(), '},',
                '{"trait_type":"Blunt Damage","value":', offensive.bluntDamage.toString(), '},',
                '{"trait_type":"Burn Damage","value":', offensive.burnDamage.toString(), '},',
                '{"trait_type":"Pierce","value":', offensive.pierce.toString(), '},',
                '{"trait_type":"Lethality","value":', offensive.lethality.toString(), '}'
            )
        );
    }

    /**
     * @dev Generates defensive stats attributes
     */
    function _generateDefensiveStatsAttributes(WeaponTypes.DefensiveStats memory defensive) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"trait_type":"Sharp Resistance","value":', defensive.sharpResistance.toString(), '},',
                '{"trait_type":"Blunt Resistance","value":', defensive.bluntResistance.toString(), '},',
                '{"trait_type":"Burn Resistance","value":', defensive.burnResistance.toString(), '},',
                '{"trait_type":"Guard","value":', defensive.guard.toString(), '}'
            )
        );
    }

    /**
     * @dev Generates abilities attribute as a comma-separated string
     */
    function _generateAbilitiesAttribute(string[] memory abilities) private pure returns (string memory) {
        if (abilities.length == 0) {
            return '{"trait_type":"Abilities","value":"None"}';
        }

        string memory abilitiesString = abilities[0];
        for (uint256 i = 1; i < abilities.length; i++) {
            abilitiesString = string(abi.encodePacked(abilitiesString, ", ", abilities[i]));
        }

        return string(
            abi.encodePacked(
                '{"trait_type":"Abilities","value":"', abilitiesString, '"}'
            )
        );
    }

    /**
     * @dev Converts WeaponType enum to string
     */
    function _weaponTypeToString(WeaponTypes.WeaponType weaponType) private pure returns (string memory) {
        if (weaponType == WeaponTypes.WeaponType(0)) return "Sword";
        if (weaponType == WeaponTypes.WeaponType(1)) return "Axe";
        if (weaponType == WeaponTypes.WeaponType(2)) return "Bow";
        if (weaponType == WeaponTypes.WeaponType(3)) return "Staff";
        return "Unknown";
    }
}
