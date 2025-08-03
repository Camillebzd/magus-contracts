// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title WeaponTypes
 * @dev Library containing all weapon-related data structures
 */
library WeaponTypes {
    
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

    struct WeaponData {
        string name;
        string description;
        string image;
        uint16 level;
        uint16 stage;
        WeaponStats weaponStats;
        uint16 xp;
        string[] abilities;
    }

    // Weapon type enum for different weapon categories
    enum WeaponType {
        SWORD,
        AXE,
        BOW,
        STAFF,
        DAGGER,
        HAMMER,
        SPEAR,
        WAND
    }
}
