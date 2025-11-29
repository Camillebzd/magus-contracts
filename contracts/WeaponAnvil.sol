// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Weapon.sol";
import "./WeaponTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMaterial} from "./materials/IMaterial.sol";

contract WeaponAnvil is Ownable {

    Weapon public weapon;

    // Tier templates - covers 10 levels each (1-10, 11-20, 21-30, etc.)
    struct TierTemplate {
        uint16 xpRequiredPerLevel;              // XP required to level up within this tier
        uint256 materialCost;                   // Base material cost for level 1 of this tier
        address materialToken;                  // Address of the ERC20 token used as material
        WeaponTypes.WeaponStats baseStatBonus;  // Flat stat bonus per level within this tier
    }

    // Tier upgrade templates - major upgrades every 10 levels
    struct TierUpgradeTemplate {
        uint256 materialCost;                   // Material cost to upgrade to next tier
        address materialToken;                  // Address of the ERC20 token used as material
        string newName;                         // New name
        string newImage;                        // Image for new appearance
        WeaponTypes.WeaponStats baseStatBonus;  // Flat stat bonus for reaching this tier
        string[] newAbilities;                  // New abilities unlocked with tier upgrade
    }

    // weaponType => tier => tier template (tier 1 = levels 1-10, tier 2 = levels 11-20, etc.)
    mapping(string => mapping(uint16 => TierTemplate)) public tierTemplates;

    // weaponType => tier => tier upgrade template (upgrade from tier N to tier N+1)
    mapping(string => mapping(uint16 => TierUpgradeTemplate)) public tierUpgradeTemplates;

    // Constants
    uint16 public constant LEVELS_PER_TIER = 10;
    uint16 public constant MAX_TIERS = 8;

    // Events
    event WeaponLeveledUp(uint256 indexed tokenId, uint16 newLevel);
    event WeaponTierUpgraded(uint256 indexed tokenId, uint16 newTier);
    event TierTemplateSet(string indexed weaponType, uint16 tier);
    event TierUpgradeTemplateSet(string indexed weaponType, uint16 tier);

    error NotWeaponOwner();
    error InvalidTier();
    error MaxTierReached();
    error TierTemplateNotSet();
    error TierUpgradeTemplateNotSet();
    error InsufficientMaterials();
    error InsufficientXP();

    modifier onlyWeaponOwner(uint256 tokenId) {
        if (weapon.ownerOf(tokenId) != msg.sender) {
            revert NotWeaponOwner();
        }
        _;
    }

    constructor(address initialOwner) 
        Ownable(initialOwner)
    {}

    /**
     * @dev Set the weapon contract address
     */
    function setWeapon(address _weapon) external onlyOwner {
        weapon = Weapon(_weapon);
    }

    /**
     * @dev Set tier template for a specific weapon type and tier
     * @param weaponType The weapon type to configure
     * @param tier The tier to configure (1-based, tier 1 = levels 1-9, tier 2 = levels 10-19, etc.)
     * @param template The tier template data
     */
    function setTierTemplate(
        string memory weaponType,
        uint16 tier,
        TierTemplate memory template
    ) external onlyOwner {
        if (tier < 1 || tier > MAX_TIERS) {
            revert InvalidTier();
        }

        tierTemplates[weaponType][tier] = template;

        emit TierTemplateSet(weaponType, tier);
    }

    /**
     * @dev Set tier upgrade template for a specific weapon type and tier
     * @param weaponType The weapon type to configure
     * @param tier The tier to configure (upgrade FROM this tier TO the next)
     * @param template The tier upgrade template data
     */
    function setTierUpgradeTemplate(
        string memory weaponType,
        uint16 tier,
        TierUpgradeTemplate memory template
    ) external onlyOwner {
        if (tier < 1 || tier >= MAX_TIERS) {
            revert InvalidTier();
        }

        tierUpgradeTemplates[weaponType][tier] = template;

        emit TierUpgradeTemplateSet(weaponType, tier);
    }

    /**
     * Level up a weapon spending XP and materials, the materials are consumed.
     * Note: Only the xp needed for the level up is used, any extra xp is retained.
     * @dev The material token must be approved for transfer by this contract beforehand
     * @param tokenId The weapon token ID to level up
     */
    function levelUp(uint256 tokenId) external onlyWeaponOwner(tokenId) {
        WeaponTypes.WeaponData memory weaponData = weapon.getWeapon(tokenId);
        string memory weaponType = weaponData.weaponType;

        uint16 currentTier = _getTierFromLevel(weaponData.level);
        if (currentTier >= MAX_TIERS) {
            revert MaxTierReached();
        }

        // Check in the correct tier before leveling up (tier 1 - levels 1-10, tier 2 - levels 11-20, etc.)
        if (_getTierFromLevel(weaponData.level + 1) != currentTier) {
            revert InvalidTier();
        }

        TierTemplate memory tierTemplate = tierTemplates[weaponType][currentTier];
        if (tierTemplate.materialCost == 0) {
            revert TierTemplateNotSet();
        }

        // Burn materials required for level up
        IMaterial materialToken = IMaterial(tierTemplate.materialToken);
        uint256 materialCost = tierTemplate.materialCost;
        materialToken.burnFrom(msg.sender, materialCost);

        // Check if enough XP to level up and reduce it accordingly
        // Apply level up and stat increases
        if (weaponData.xp >= tierTemplate.xpRequiredPerLevel) {
            weaponData.xp -= tierTemplate.xpRequiredPerLevel;
            weaponData.level += 1;

            // Apply stat improvements for this level
            _applyLevelUpStats(weaponData, tierTemplate);
        } else {
            revert InsufficientXP();
        }

        // Update weapon in contract
        weapon.updateWeapon(tokenId, weaponData);

        emit WeaponLeveledUp(tokenId, weaponData.level);
    }

    /**
     * @dev Upgrade a weapon to the next tier
     * Note: The xp is reset to 0 upon tier upgrade
     * @param tokenId The weapon token ID to upgrade
     */
    function upgradeTier(uint256 tokenId) external onlyWeaponOwner(tokenId) {
        WeaponTypes.WeaponData memory weaponData = weapon.getWeapon(tokenId);
        string memory weaponType = weaponData.weaponType;

        uint16 currentTier = _getTierFromLevel(weaponData.level);
        uint16 nextTier = currentTier + 1;

        // Check if at max level of current tier
        require(weaponData.level == currentTier * LEVELS_PER_TIER, "Must be at max level of tier");
        if (currentTier >= MAX_TIERS) {
            revert MaxTierReached();
        }

        TierUpgradeTemplate memory upgradeTemplate = tierUpgradeTemplates[weaponType][currentTier];

        if (upgradeTemplate.materialCost == 0) {
            revert TierUpgradeTemplateNotSet();
        }

        // Burn materials required for upgrade
        IMaterial materialToken = IMaterial(upgradeTemplate.materialToken);
        uint256 materialCost = upgradeTemplate.materialCost;
        materialToken.burnFrom(msg.sender, materialCost);

        // Apply tier upgrade
        _applyTierUpgrade(weaponData, upgradeTemplate);

        // Jump to next tier's starting level
        weaponData.level += 1;
        weaponData.tier = nextTier;
        weaponData.xp = 0; // Reset XP for new tier

        // Update weapon in contract
        weapon.updateWeapon(tokenId, weaponData);

        emit WeaponTierUpgraded(tokenId, nextTier);
    }

    /**
     * @dev Internal function to apply level up stat improvements
     */
    function _applyLevelUpStats(
        WeaponTypes.WeaponData memory weaponData,
        TierTemplate memory tierTemplate
    ) private pure {
        // Apply base stat
        weaponData.stats.health += tierTemplate.baseStatBonus.health;
        weaponData.stats.speed += tierTemplate.baseStatBonus.speed;
        weaponData.stats.mind += tierTemplate.baseStatBonus.mind;
        weaponData.stats.handling += tierTemplate.baseStatBonus.handling;

        // Apply offensive stat
        weaponData.stats.offensiveStats.sharpDamage += tierTemplate.baseStatBonus.offensiveStats.sharpDamage;
        weaponData.stats.offensiveStats.bluntDamage += tierTemplate.baseStatBonus.offensiveStats.bluntDamage;
        weaponData.stats.offensiveStats.burnDamage += tierTemplate.baseStatBonus.offensiveStats.burnDamage;
        weaponData.stats.offensiveStats.pierce += tierTemplate.baseStatBonus.offensiveStats.pierce;
        weaponData.stats.offensiveStats.lethality += tierTemplate.baseStatBonus.offensiveStats.lethality;
            
        // Apply defensive stat
        weaponData.stats.defensiveStats.sharpResistance += tierTemplate.baseStatBonus.defensiveStats.sharpResistance;
        weaponData.stats.defensiveStats.bluntResistance += tierTemplate.baseStatBonus.defensiveStats.bluntResistance;
        weaponData.stats.defensiveStats.burnResistance += tierTemplate.baseStatBonus.defensiveStats.burnResistance;
        weaponData.stats.defensiveStats.guard += tierTemplate.baseStatBonus.defensiveStats.guard;
    }

    /**
     * @dev Internal function to apply tier upgrade bonuses
     */
    function _applyTierUpgrade(
        WeaponTypes.WeaponData memory weaponData,
        TierUpgradeTemplate memory template
    ) private pure {
        // Update name with new name
        weaponData.name = template.newName;

        // Update image with new image
        weaponData.image = template.newImage;

        // Apply flat stat bonuses
        weaponData.stats.health += template.baseStatBonus.health;
        weaponData.stats.speed += template.baseStatBonus.speed;
        weaponData.stats.mind += template.baseStatBonus.mind;
        weaponData.stats.handling += template.baseStatBonus.handling;

        // Apply offensive stat bonuses
        weaponData.stats.offensiveStats.sharpDamage += template.baseStatBonus.offensiveStats.sharpDamage;
        weaponData.stats.offensiveStats.bluntDamage += template.baseStatBonus.offensiveStats.bluntDamage;
        weaponData.stats.offensiveStats.burnDamage += template.baseStatBonus.offensiveStats.burnDamage;
        weaponData.stats.offensiveStats.pierce += template.baseStatBonus.offensiveStats.pierce;
        weaponData.stats.offensiveStats.lethality += template.baseStatBonus.offensiveStats.lethality;

        // Apply defensive stat bonuses
        weaponData.stats.defensiveStats.sharpResistance += template.baseStatBonus.defensiveStats.sharpResistance;
        weaponData.stats.defensiveStats.bluntResistance += template.baseStatBonus.defensiveStats.bluntResistance;
        weaponData.stats.defensiveStats.burnResistance += template.baseStatBonus.defensiveStats.burnResistance;
        weaponData.stats.defensiveStats.guard += template.baseStatBonus.defensiveStats.guard;

        // Add new abilities by creating a merged memory array
        uint256 oldLen = weaponData.abilities.length;
        uint256 addLen = template.newAbilities.length;
        string[] memory merged = new string[](oldLen + addLen);

        for (uint256 i = 0; i < oldLen; i++) {
            merged[i] = weaponData.abilities[i];
        }
        for (uint256 j = 0; j < addLen; j++) {
            merged[oldLen + j] = template.newAbilities[j];
        }

        weaponData.abilities = merged;
    }

    /**
     * @dev Internal function to get tier from level
     * @param level The weapon level
     * @return tier The tier (1-based)
     */
    function _getTierFromLevel(uint16 level) private pure returns (uint16 tier) {
        return ((level - 1) / LEVELS_PER_TIER) + 1;
    }
}
