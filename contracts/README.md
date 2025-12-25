# Smart Contract - HiddenAttributeNFT

## Overview

`HiddenAttributeNFT.sol` is an ERC721 NFT contract with Fully Homomorphic Encryption (FHE) capabilities, allowing encrypted messages to be stored on-chain.

## Contract Details

- **Network**: Ethereum Sepolia Testnet
- **Contract Address**: `0x20d253d41e676f877b2897d332675A8d5fC11275`
- **FHEVM Version**: v0.10.0
- **Compiler**: Solidity ^0.8.28

[View on Etherscan](https://sepolia.etherscan.io/address/0x20d253d41e676f877b2897d332675A8d5fC11275)

## Key Features

### 1. FHE-Encrypted Messages
- Uses `euint256` from Zama's FHEVM for encrypted storage
- Messages are encrypted client-side before being sent to the contract
- Only authorized users can decrypt (via `FHE.allow()`)

### 2. Image Storage
- Stores image URIs (IPFS or base64)
- Images are NOT encrypted (public display)
- Separate storage from encrypted messages

### 3. Access Control
- Automatic permission grant to token owner
- Contract can access encrypted data for computations
- Built-in `FHE.allowThis()` for internal operations

## Contract Functions

### Mint NFT
```solidity
function mint(
    externalEuint256 encryptedMessage,
    bytes calldata inputProof,
    string calldata imageURI
) external returns (uint256 tokenId)
```
Mints a new NFT with an encrypted message and image URI.

**Parameters**:
- `encryptedMessage`: FHE-encrypted uint256 value
- `inputProof`: Zero-knowledge proof for the encrypted input
- `imageURI`: IPFS URL or base64 string for the image

**Returns**: The minted token ID

### Get Encrypted Message
```solidity
function getEncryptedMessage(uint256 tokenId) 
    public view returns (euint256)
```
Returns the encrypted message handle (requires decryption key to read).

### Get Image URI
```solidity
function getTokenImageURI(uint256 tokenId) 
    public view returns (string memory)
```
Returns the image URI for a token.

### Token Enumeration
```solidity
function tokensOfOwner(address owner) 
    public view returns (uint256[] memory)
```
Returns all token IDs owned by an address.

## Encryption Flow

```
User Input → FHE Encryption (Client) → Encrypted Handle + Proof
                                        ↓
                            Contract Storage (euint256)
                                        ↓
                        Access Control (FHE.allow)
                                        ↓
                            Decryption (Client)
```

## Dependencies

### Zama FHEVM
```solidity
import "@fhevm/lib/FHE.sol";
import "@fhevm/lib/ZamaEthereumConfig.sol";
import "@fhevm/lib/Externaleuint256.sol";
```

### OpenZeppelin
```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
```

## Security Considerations

### ✅ Implemented
- Access control via `FHE.allow()`
- Zero-knowledge proofs for encrypted inputs
- Standard ERC721 security patterns

### ⚠️ Important Notes
- This is a **testnet contract** - not audited for production
- Encrypted messages are stored on-chain but require decryption
- Image URIs are public and not encrypted

## Gas Costs

Approximate gas costs on Sepolia:

| Operation | Gas Cost |
|-----------|----------|
| Mint NFT | ~300,000 |
| Transfer | ~100,000 |
| View Functions | Free |

**Note**: FHE operations are more expensive than regular storage.

## Deployment

The contract was deployed using Hardhat with the following configuration:

```javascript
// FHEVM v0.10.0
// ZamaEthereumConfig for Sepolia
// Deployed via Infura RPC
```

See `DEPLOYMENT.md` for frontend deployment instructions.

## Testing

To test the contract locally:

```bash
# Install dependencies
npm install @fhevm/solidity @openzeppelin/contracts

# Compile
npx hardhat compile

# Run tests (if available)
npx hardhat test
```

## License

MIT License

## Links

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Contract Source Code](./HiddenAttributeNFT.sol)
- [Frontend Application](../frontend)

---

Built with Zama's Fully Homomorphic Encryption 🔐
