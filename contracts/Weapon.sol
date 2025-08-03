// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WeaponTypes} from "./WeaponTypes.sol";
import {WeaponMetadata} from "./WeaponMetadata.sol";
import {WeaponFactory} from "./WeaponFactory.sol";

contract Weapon is ERC721, ERC721Enumerable, Ownable {
    using WeaponTypes for WeaponTypes.WeaponData;

    uint256 private _nextTokenId;
    WeaponFactory private _weaponFactory;

    // Mapping from token ID to weapon data
    mapping(uint256 => WeaponTypes.WeaponData) private _weapons;

    event WeaponRequested(address indexed requester, uint256 indexed tokenId, WeaponTypes.WeaponType weaponType);
    event WeaponFactoryUpdated(address indexed oldFactory, address indexed newFactory);

    constructor(address initialOwner, address weaponFactoryAddress)
        ERC721("Weapon", "WPN")
        Ownable(initialOwner)
    {
        _weaponFactory = WeaponFactory(weaponFactoryAddress);
    }

    /**
     * @dev Mints a new weapon NFT based on weapon type from factory
     */
    function requestWeapon(WeaponTypes.WeaponType weaponType) external returns (uint256) {
        require(_weaponFactory.isWeaponTypeConfigured(weaponType), "Weapon: Invalid weapon type");

        uint256 tokenId = _nextTokenId++;

        // Get weapon data from factory
        WeaponTypes.WeaponData memory weaponData = _weaponFactory.createWeapon(weaponType);
        _weapons[tokenId] = weaponData;

        _safeMint(msg.sender, tokenId);

        emit WeaponRequested(msg.sender, tokenId, weaponType);
        return tokenId;
    }

    /**
     * @dev Mints a new weapon NFT with custom specified metadata (owner only)
     */
    function requestCustomWeapon(
        WeaponTypes.WeaponData memory weaponData
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;

        _weapons[tokenId] = weaponData;

        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    /**
     * @dev Updates the weapon factory address (owner only)
     */
    function setWeaponFactory(address newWeaponFactory) external onlyOwner {
        address oldFactory = address(_weaponFactory);
        _weaponFactory = WeaponFactory(newWeaponFactory);
        emit WeaponFactoryUpdated(oldFactory, newWeaponFactory);
    }

    /**
     * @dev Returns the current weapon factory address
     */
    function getWeaponFactory() external view returns (address) {
        return address(_weaponFactory);
    }

    /**
     * @dev Returns the weapon data for a given token ID
     */
    function getWeapon(uint256 tokenId) public view returns (WeaponTypes.WeaponData memory) {
        _requireOwned(tokenId);
        return _weapons[tokenId];
    }

    /**
     * @notice This is only for testing purposes, it should not be used in production
     * @dev Updates weapon data (only owner can update)
     * @param tokenId The ID of the weapon to update
     * @param weaponData The new weapon data to set
     */
    function updateWeapon(uint256 tokenId, WeaponTypes.WeaponData memory weaponData) public onlyOwner {
        _requireOwned(tokenId);
        _weapons[tokenId] = weaponData;
    }

    /**
     * @dev WIP
     */
    // function levelUp(uint256 tokenId, uint16 xpGained) public onlyOwner {
    //     _requireOwned(tokenId);
    //     WeaponTypes.WeaponData storage weapon = _weapons[tokenId];
    //     weapon.xp += xpGained;
        
    //     // Simple level up logic - every 100 XP increases level
    //     uint16 newLevel = weapon.level + (weapon.xp / 100);
    //     if (newLevel > weapon.level) {
    //         weapon.level = newLevel;
    //     }
    // }

    /**
     * @dev Overrides tokenURI to generate on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return WeaponMetadata.generateTokenURI(_weapons[tokenId]);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
