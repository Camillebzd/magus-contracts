// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

library GearFactory {

    using Strings for uint16;

    struct OffensiveStats {
        uint16 sharpDamage;
        uint16 bluntDamage;
        uint16 burnDamage;
        uint16 pierce;
        uint16 lethality;
    }

    struct DefensiveStats {
        uint16 sharpResistance;
        uint16 bluntResistance;
        uint16 burnResistance;
        uint16 guard;
    }

    struct WeaponStats {
        uint16 health;
        uint16 speed;
        uint16 mind;
        OffensiveStats offensiveStats;
        DefensiveStats defensiveStats;
        uint16 handling;
    }

    struct Weapon {
        string name;
        string description;
        string image;
        uint16 level;
        uint16 stage;
        WeaponStats weaponStats;
        uint16 xp;
        string identity;
        string[] abilities;
    }

    function createTokenURI(Weapon memory _weapon) external pure returns (string memory) {
        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name": "', _weapon.name, '", ',
                '"description": "', _weapon.description, '", ',
                '"image": "', _weapon.image, '", ',
                createAttributes(_weapon),
            '}'
        );
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    function createAttributes(Weapon memory _weapon) private pure returns (string memory) {
        return string(abi.encodePacked(
            '"attributes": [',
                '{', 
                    '"trait_type" : "Level",',
                    '"value" : "', _weapon.level.toString(), '"',
                '}, ',
                '{', 
                    '"trait_type" : "Stage",',
                    '"value" : "', _weapon.stage.toString(), '"',
                '}, ',
                formatStats(_weapon),
                '{', 
                    '"trait_type" : "Abilities", ',
                    '"value" : ', formatAbilities(_weapon),
                '}, ',
                '{', 
                    '"trait_type" : "Experience", ',
                    '"value" : "', _weapon.xp.toString(), '"',
                '}, ',
                '{', 
                    '"trait_type" : "Identity", ',
                    '"value" : "', _weapon.identity, '"',
                '}',
            ']'
        ));
    }

    function formatStats(Weapon memory _weapon) private pure returns (string memory) {
        return string(abi.encodePacked(
            '{', 
                '"trait_type" : "Health", ',
                '"value" : "', _weapon.weaponStats.health.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Speed", ',
                '"value" : "', _weapon.weaponStats.speed.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Mind", ',
                '"value" : "', _weapon.weaponStats.mind.toString(), '"',
            '}, ',
            formatOffensiveStats(_weapon),
            formatDefensiveStats(_weapon),
            '{', 
                '"trait_type" : "Handling", ',
                '"value" : "', _weapon.weaponStats.handling.toString(), '"',
            '}, '
        ));
    }

    function formatOffensiveStats(Weapon memory _weapon) private pure returns (string memory) {
        return string(abi.encodePacked(
            '{', 
                '"trait_type" : "Sharp Damage", ',
                '"value" : "', _weapon.weaponStats.offensiveStats.sharpDamage.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Blunt Damage", ',
                '"value" : "', _weapon.weaponStats.offensiveStats.bluntDamage.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Burn Damage", ',
                '"value" : "', _weapon.weaponStats.offensiveStats.burnDamage.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Pierce", ',
                '"value" : "', _weapon.weaponStats.offensiveStats.pierce.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Lethality", ',
                '"value" : "', _weapon.weaponStats.offensiveStats.lethality.toString(), '"',
            '}, '
        ));
    }

    function formatDefensiveStats(Weapon memory _weapon) private pure returns (string memory) {
        return string(abi.encodePacked(
            '{', 
                '"trait_type" : "Sharp Resistance", ',
                '"value" : "', _weapon.weaponStats.defensiveStats.sharpResistance.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Blunt Resistance", ',
                '"value" : "', _weapon.weaponStats.defensiveStats.bluntResistance.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Burn Resistance", ',
                '"value" : "', _weapon.weaponStats.defensiveStats.burnResistance.toString(), '"',
            '}, ',
            '{', 
                '"trait_type" : "Guard", ',
                '"value" : "', _weapon.weaponStats.defensiveStats.guard.toString(), '"',
            '}, '
        ));
    }

    function formatAbilities(Weapon memory _weapon) private pure returns (string memory) {
        string memory abilitiesFormated = '[';
        for (uint i = 0; i < _weapon.abilities.length; i++) {
            abilitiesFormated = string.concat(abilitiesFormated, '"');
            abilitiesFormated = string.concat(abilitiesFormated, _weapon.abilities[i]);
            abilitiesFormated = string.concat(abilitiesFormated, '"');
            if (i + 1 != _weapon.abilities.length)
                abilitiesFormated = string.concat(abilitiesFormated, ', ');
        }
        return string.concat(abilitiesFormated, ']');
    }

    function gainXP(Weapon storage _weapon, uint16 _xp) external {
        _weapon.xp += _xp;
    }

    function levelUp(Weapon storage _weapon, uint16 _newLevel, WeaponStats memory _upgradeStats, string[] memory newAbilities, uint16 xpLeft) external  {
        _weapon.weaponStats.health += _upgradeStats.health;
        _weapon.weaponStats.speed += _upgradeStats.speed;
        _weapon.weaponStats.mind += _upgradeStats.mind;
        _weapon.weaponStats.offensiveStats.sharpDamage += _upgradeStats.offensiveStats.sharpDamage;
        _weapon.weaponStats.offensiveStats.bluntDamage += _upgradeStats.offensiveStats.bluntDamage;
        _weapon.weaponStats.offensiveStats.burnDamage += _upgradeStats.offensiveStats.burnDamage;
        _weapon.weaponStats.offensiveStats.pierce += _upgradeStats.offensiveStats.pierce;
        _weapon.weaponStats.offensiveStats.lethality += _upgradeStats.offensiveStats.lethality;
        _weapon.weaponStats.defensiveStats.sharpResistance += _upgradeStats.defensiveStats.sharpResistance;
        _weapon.weaponStats.defensiveStats.bluntResistance += _upgradeStats.defensiveStats.bluntResistance;
        _weapon.weaponStats.defensiveStats.burnResistance += _upgradeStats.defensiveStats.burnResistance;
        _weapon.weaponStats.defensiveStats.guard += _upgradeStats.defensiveStats.guard;
        _weapon.weaponStats.handling += _upgradeStats.handling;
        _weapon.level = _newLevel;
        if (newAbilities.length > 0)
            for (uint i = 0; i < newAbilities.length; i++)
                _weapon.abilities.push(newAbilities[i]);
        _weapon.xp = xpLeft;
    }
}