// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XP is EIP712, Ownable {
    address public server;
    mapping(address => mapping(uint256 => uint256)) public balances;
    mapping(address => mapping(uint256 => uint256)) public nonces;

    bytes32 private constant ADD_XP_TYPEHASH = keccak256("addXP(address nftAddr,uint256 tokenId,uint256 amount,uint256 nonce)");

    error InvalidNonce();
    error InvalidSignature();
    error InvalidServerAddress();

    constructor(address _initialOwner, address _server) EIP712("XP", "1.0") Ownable(_initialOwner) {
        server = _server;
    }

    function addXP(
        address nftAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (nonce != nonces[nftAddr][tokenId]) {
            revert InvalidNonce();
        }

        bytes32 structHash = keccak256(abi.encode(ADD_XP_TYPEHASH, nftAddr, tokenId, amount, nonce));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (signer != server) {
            revert InvalidSignature();
        }

        balances[nftAddr][tokenId] += amount;
        nonces[nftAddr][tokenId]++;
    }

    // Optional view function to get current nonce for an NFT
    function getNonce(address nftAddr, uint256 tokenId) external view returns (uint256) {
        return nonces[nftAddr][tokenId];
    }

    // Optional view function to get balance for an NFT
    function getBalance(address nftAddr, uint256 tokenId) external view returns (uint256) {
        return balances[nftAddr][tokenId];
    }

    function setServer(address _newServer) external onlyOwner {
        require(_newServer != address(0), "Invalid server address");
        server = _newServer;
    }
}