// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FHE, euint32, euint256, externalEuint32, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Hidden Attribute NFT
/// @notice ERC721 collection storing encrypted numeric attributes for each token.
/// @dev Uses Zama's FHEVM library to handle encrypted data and access control.
contract HiddenAttributeNFT is ERC721Enumerable, Ownable, ZamaEthereumConfig {
    /// @dev Emitted when attempting to read an attribute that has not been initialized yet.
    error AttributeNotInitialized(uint256 tokenId);

    /// @notice Next token identifier to mint.
    uint256 private _nextTokenId;

    /// @notice Base URI appended with token id for metadata lookups.
    string private _baseTokenURI;

    /// @notice Encrypted message stored for every minted token id.
    mapping(uint256 tokenId => euint256) private _tokenMessages;

    /// @notice Image URI for each token.
    mapping(uint256 tokenId => string) private _tokenImageURIs;

    constructor(string memory name_, string memory symbol_, string memory baseTokenURI_)
        ERC721(name_, symbol_)
        Ownable(_msgSender())
    {
        _baseTokenURI = baseTokenURI_;
        _nextTokenId = 1;
    }

    /// @notice Mints a token for the caller with an encrypted message and image URI.
    /// @param encryptedMessage Ciphertext handle for encrypted message returned by the Relayer SDK.
    /// @param inputProof Proof tied to the encrypted input.
    /// @param imageURI The URI pointing to the NFT image (IPFS, HTTP, etc.).
    /// @return tokenId Newly minted token id.
    function mint(externalEuint256 encryptedMessage, bytes calldata inputProof, string calldata imageURI) external returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        unchecked {
            _nextTokenId = tokenId + 1;
        }

        _safeMint(_msgSender(), tokenId);

        euint256 message = FHE.fromExternal(encryptedMessage, inputProof);
        _tokenMessages[tokenId] = message;
        _tokenImageURIs[tokenId] = imageURI;

        FHE.allowThis(message);
        FHE.allow(message, _msgSender());
    }

    /// @notice Returns the encrypted message stored for a token id.
    /// @param tokenId Token whose encrypted message is queried.
    /// @return Encrypted message stored on-chain.
    function getEncryptedMessage(uint256 tokenId) external view returns (euint256) {
        ownerOf(tokenId);

        euint256 message = _tokenMessages[tokenId];
        if (!FHE.isInitialized(message)) {
            revert AttributeNotInitialized(tokenId);
        }

        return message;
    }

    /// @notice Returns the image URI for a specific token.
    /// @param tokenId Token whose image URI is queried.
    /// @return The image URI string.
    function getTokenImageURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return _tokenImageURIs[tokenId];
    }

    /// @notice Lists all token ids owned by an address.
    /// @param owner Address to enumerate tokens for.
    /// @return tokens List of token ids owned by `owner`.
    function tokensOfOwner(address owner) external view returns (uint256[] memory tokens) {
        uint256 balance = balanceOf(owner);
        tokens = new uint256[](balance);
        for (uint256 index = 0; index < balance; index++) {
            tokens[index] = tokenOfOwnerByIndex(owner, index);
        }
    }

    /// @notice Updates the base token URI used for metadata.
    /// @param newBaseURI New base URI string.
    function setBaseTokenURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    /// @inheritdoc ERC721
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @inheritdoc ERC721
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);

        if (to != address(0)) {
            euint256 message = _tokenMessages[tokenId];
            if (FHE.isInitialized(message)) {
                FHE.allow(message, to);
                FHE.allowThis(message);
            }
        }

        return previousOwner;
    }
}
