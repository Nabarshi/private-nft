# Private-NFT - Privacy-Preserving NFTs on Sepolia

A fully homomorphic encryption (FHE) enabled NFT platform built with Zama's FHEVM, allowing users to mint NFTs with encrypted messages on Ethereum Sepolia testnet.

## 🔐 Features

- **Fully Homomorphic Encryption**: Messages are encrypted on-chain using Zama's FHEVM
- **Image Upload**: Upload images via IPFS (Pinata) or base64 encoding
- **Real Blockchain Integration**: Deployed on Sepolia testnet with real transactions
- **Privacy-Preserving**: Only NFT owners can view their messages (stored locally)
- **Transfer NFTs**: Transfer ownership to other addresses
- **Gallery View**: Browse all your minted NFTs

## 🚀 Live Demo

Deployed Contract on Sepolia: `0xb23e1c3E307C161bc97cF1540e730e36d98755e2`

[View on Etherscan](https://sepolia.etherscan.io/address/0xb23e1c3E307C161bc97cF1540e730e36d98755e2)

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** with FHEVM v0.10.0
- **Zama FHE Library** for encrypted computations
- **Hardhat** for development and deployment

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development
- **Ethers.js v6** for blockchain interactions
- **Zama Relayer SDK** for FHE encryption
- **Pinata** for IPFS storage

## 📋 Prerequisites

- Node.js v22+ (required for Zama SDK)
- MetaMask wallet
- Sepolia ETH (get from [faucet](https://sepolia-faucet.pk910.de/))

## 🏗️ Smart Contract

The main contract `HiddenAttributeNFT.sol` implements:

```solidity
// Mint NFT with encrypted message
function mint(
    externalEuint256 encryptedMessage,
    bytes calldata inputProof,
    string calldata imageURI
) external returns (uint256 tokenId)

// Get encrypted message (only owner can decrypt)
function getEncryptedMessage(uint256 tokenId) public view returns (euint256)
```

### Key Features:
- Uses `euint256` for FHE-encrypted message storage
- Implements access control via `FHE.allow()`
- Stores image URIs separately (not encrypted)
- ERC721Enumerable for easy token enumeration

## 🖥️ Local Development

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment (Optional)

For IPFS uploads via Pinata, create `frontend/.env`:

```env
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=your_gateway_url
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🌐 Deploy to Vercel

### Option 1: Deploy via Vercel CLI

```bash
npm install -g vercel
cd frontend
vercel
```

### Option 2: Deploy via Git

1. Push this repository to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your GitHub repository
4. Set **Root Directory** to: `frontend`
5. Click **Deploy**

### Environment Variables (Optional)

Add in Vercel dashboard → Settings → Environment Variables:

- `VITE_PINATA_JWT` - Your Pinata JWT token
- `VITE_PINATA_GATEWAY` - Your Pinata gateway URL

## 📖 How It Works

### Encryption Flow

1. **User Input**: Enter message text
2. **FHE Encryption**: Message encrypted using Zama SDK in browser
3. **Upload Image**: Image uploaded to IPFS/base64
4. **Mint Transaction**: Call `mint()` with encrypted data
5. **Local Storage**: Original message saved locally for owner

### Decryption Flow

1. **Click Reveal**: User clicks 🔓 button
2. **Check Local**: First checks localStorage for message
3. **Owner**: If owner → Display original message
4. **Others**: If not owner → Show "encrypted" placeholder

This proves the message is **truly private** on the blockchain!

## 🔑 Privacy Model

- **On-Chain**: Messages are encrypted with FHE (`euint256`)
- **Local Storage**: Original messages stored in browser for convenience
- **Access Control**: Contract implements `FHE.allow()` for owner-only access
- **No Backend**: No server stores plaintext messages

## 📄 Contract Details

- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Contract Address**: `0xb23e1c3E307C161bc97cF1540e730e36d98755e2`
- **FHEVM Version**: v0.10.0
- **Gateway**: Zama Ethereum Config

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📜 License

MIT License

## 🔗 Links

- [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- [Etherscan Contract](https://sepolia.etherscan.io/address/0x20d253d41e676f877b2897d332675A8d5fC11275)
- [Sepolia Faucet](https://sepolia-faucet.pk910.de/)

## ⚠️ Disclaimer

This is a testnet demonstration project. Do not use in production without proper security audits.

---

Built with ❤️ using Zama's Fully Homomorphic Encryption
