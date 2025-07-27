// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./GearFactory.sol";

contract GearFight is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => GearFactory.Weapon) public weapons;
    uint256 public maxWeaponsRequest;
    mapping(address => uint256) public weaponsRequested;

    constructor() ERC721("GearFight", "GF") {
        maxWeaponsRequest = 1;
    }

    modifier notEmptyWeapon(GearFactory.Weapon memory weapon) {
        require(bytes(weapon.identity).length != 0);
        require(bytes(weapon.name).length != 0);
        require(bytes(weapon.image).length != 0);
        _;
    }

    function requestWeapon(GearFactory.Weapon memory newWeapon) external notEmptyWeapon(newWeapon) {
        require(weaponsRequested[msg.sender] < maxWeaponsRequest);
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        weapons[tokenId] = newWeapon;
        _setTokenURI(tokenId, GearFactory.createTokenURI(weapons[tokenId]));
        weaponsRequested[msg.sender] += 1;
    }

    function setWeaponsRequest(uint256 _maxWeaponsRequest) external onlyOwner {
        maxWeaponsRequest = _maxWeaponsRequest;
    }

    // ------------------------ WORK IN PROGRESS ------------------------

    // no protection from spamming and no protection for call by other than owner
    // -> put a rate limite example 3 blocks between each call...
    function gainXP(uint256 tokenId, uint16 _xp) external notEmptyWeapon(weapons[tokenId]) {
        GearFactory.gainXP(weapons[tokenId], _xp);
        _setTokenURI(tokenId, GearFactory.createTokenURI(weapons[tokenId]));
    }

    // no protection from spamming and no protection for call by other than owner
    function levelUp(uint256 tokenId, uint16 newLevel, GearFactory.WeaponStats memory upgradeStats, string[] memory newAbilities, uint16 xpLeft) external notEmptyWeapon(weapons[tokenId]) {
        GearFactory.levelUp(weapons[tokenId], newLevel, upgradeStats, newAbilities, xpLeft);
        _setTokenURI(tokenId, GearFactory.createTokenURI(weapons[tokenId]));
    }

    // ------------------------ OVERRIDES ------------------------

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}