// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {WeaponTypes} from "./WeaponTypes.sol";
import {WeaponMetadata} from "./WeaponMetadata.sol";
import {WeaponMold} from "./WeaponMold.sol";

contract Weapon is ERC721, ERC721Enumerable, Ownable, EIP712 {
    uint256 private _nextTokenId;
    WeaponMold private _weaponMold;

    // Mapping from token ID to weapon data
    mapping(uint256 => WeaponTypes.WeaponData) private _weapons;

    // XP system variables
    address public server;
    mapping(uint256 => uint256) public nonces;
    bytes32 public constant ADD_XP_TYPEHASH =
        keccak256("addXP(uint256 tokenId,uint256 amount,uint256 nonce)");

    event WeaponRequested(
        address indexed requester,
        uint256 indexed tokenId,
        string weaponType
    );
    event WeaponMoldUpdated(
        address indexed oldMold,
        address indexed newMold
    );
    event XPAdded(uint256 indexed tokenId, uint256 amount);

    error InvalidWeaponType();
    error InvalidNonce();
    error InvalidSignature();
    error InvalidServerAddress();

    constructor(
        address initialOwner,
        address weaponMoldAddress,
        address serverAddress
    ) ERC721("Weapon", "WPN") Ownable(initialOwner) EIP712("XP", "1.0") {
        _weaponMold = WeaponMold(weaponMoldAddress);
        server = serverAddress;
    }

    /**
     * @dev Mints a new weapon NFT based on weapon type from mold
     */
    function requestWeapon(
        string memory weaponType
    ) external returns (uint256) {
        if (!_weaponMold.isWeaponTypeConfigured(weaponType)) {
            revert InvalidWeaponType();
        }

        uint256 tokenId = _nextTokenId++;

        // Get weapon data from mold
        WeaponTypes.WeaponData memory weaponData = _weaponMold.createWeapon(
            weaponType
        );
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
     * @dev Updates the weapon mold address (owner only)
     */
    function setWeaponMold(address newWeaponMold) external onlyOwner {
        address oldMold = address(_weaponMold);
        _weaponMold = WeaponMold(newWeaponMold);
        emit WeaponMoldUpdated(oldMold, newWeaponMold);
    }

    /**
     * @dev Returns the current weapon mold address
     */
    function getWeaponMold() external view returns (address) {
        return address(_weaponMold);
    }

    /**
     * @dev Returns the weapon data for a given token ID
     */
    function getWeapon(
        uint256 tokenId
    ) public view returns (WeaponTypes.WeaponData memory) {
        _requireOwned(tokenId);
        return _weapons[tokenId];
    }

    /**
     * @dev Add XP to a weapon with server signature validation
     */
    function addXP(
        uint256 tokenId,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        _requireOwned(tokenId);

        // Validate signature using XP contract logic (but don't store in balances)
        if (nonce != nonces[tokenId]) {
            revert InvalidNonce();
        }

        bytes32 structHash = keccak256(
            abi.encode(ADD_XP_TYPEHASH, tokenId, amount, nonce)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (signer != server) {
            revert InvalidSignature();
        }

        // Update nonce to prevent replay
        nonces[tokenId]++;

        // Add XP directly to weapon data (single source of truth)
        _weapons[tokenId].xp += uint16(amount);

        emit XPAdded(tokenId, amount);
    }

    /**
     * @dev Get current nonce for a weapon token
     */
    function getNonce(uint256 tokenId) external view returns (uint256) {
        return nonces[tokenId];
    }

    /**
     * @dev Set new server address (owner only)
     */
    function setServer(address _newServer) external onlyOwner {
        if (_newServer == address(0)) {
            revert InvalidServerAddress();
        }
        server = _newServer;
    }

    /**
     * @notice This is only for testing purposes, it should not be used in production
     * @dev Updates weapon data (only owner can update)
     * @param tokenId The ID of the weapon to update
     * @param weaponData The new weapon data to set
     */
    function updateWeapon(
        uint256 tokenId,
        WeaponTypes.WeaponData memory weaponData
    ) public onlyOwner {
        _requireOwned(tokenId);
        _weapons[tokenId] = weaponData;
    }

    /**
     * @dev Overrides tokenURI to generate on-chain metadata
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return WeaponMetadata.generateTokenURI(_weapons[tokenId]);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
