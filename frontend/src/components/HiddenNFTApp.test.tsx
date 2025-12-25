import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Header } from './Header';
import { ImageUpload } from './ImageUpload';
import { uploadImage } from '../utils/imageUpload';

import '../styles/HiddenNFTApp.css';

type DecryptedMap = Record<string, string>;
type NFTItem = {
  tokenId: number;
  owner: string;
  imageUri: string;
  message: string;
};

/**
 * TEST VERSION: Disabled FHE encryption for testing image upload and UI
 * This version simulates NFT minting without actual blockchain interaction
 * Re-enable FHE when Zama Relayer is back online
 */
export function HiddenNFTAppTest() {
  const { address, isConnected } = useAccount();

  const [mintValue, setMintValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');

  const [transferToken, setTransferToken] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');

  const [decryptedAttributes, setDecryptedAttributes] = useState<DecryptedMap>({});
  const [activeDecrypt, setActiveDecrypt] = useState<bigint | null>(null);
  const [decryptStatus, setDecryptStatus] = useState('');

  // Simulated NFT storage
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [nextTokenId, setNextTokenId] = useState(1);

  const tokens = nfts.map(nft => BigInt(nft.tokenId));
  const hasWallet = Boolean(isConnected && address);

  const ZERO_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

  const handleMint = async (event: React.FormEvent) => {
    event.preventDefault();
    setMintStatus('');

    if (!hasWallet) {
      setMintStatus('Connect a wallet to mint.');
      return;
    }

    if (!selectedImage) {
      setMintStatus('Please select an image for the NFT.');
      return;
    }

    if (!mintValue.trim()) {
      setMintStatus('Please enter a message for the NFT.');
      return;
    }

    try {
      setMinting(true);
      setMintStatus('Uploading image...');

      // Upload image
      const { imageUri } = await uploadImage(selectedImage);
      setMintStatus('Image uploaded. Creating NFT...');

      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create simulated NFT
      const newNFT: NFTItem = {
        tokenId: nextTokenId,
        owner: address!,
        imageUri,
        message: mintValue,
      };

      setNfts([...nfts, newNFT]);
      setNextTokenId(nextTokenId + 1);

      setMintValue('');
      setSelectedImage(null);
      setMintStatus('✅ NFT minted successfully! (Test mode - no blockchain)');
    } catch (error) {
      console.error('Mint failed:', error);
      setMintStatus(error instanceof Error ? error.message : 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setTransferStatus('');

    if (!hasWallet) {
      setTransferStatus('Connect a wallet first.');
      return;
    }

    if (!ZERO_ADDRESS.test(transferAddress.trim())) {
      setTransferStatus('Enter a valid recipient address.');
      return;
    }

    let tokenId: number;
    try {
      tokenId = Number(transferToken);
    } catch (error) {
      setTransferStatus('Enter a valid token id.');
      return;
    }

    try {
      setTransferring(true);

      // Find and update NFT owner
      const nftIndex = nfts.findIndex(nft => nft.tokenId === tokenId);
      if (nftIndex === -1) {
        setTransferStatus('Token not found.');
        return;
      }

      const updatedNfts = [...nfts];
      updatedNfts[nftIndex].owner = transferAddress.trim();
      setNfts(updatedNfts);

      setTransferStatus('✅ Transfer completed! (Test mode)');
      setTransferToken('');
      setTransferAddress('');
      setDecryptedAttributes(prev => {
        const updated = { ...prev };
        delete updated[tokenId.toString()];
        return updated;
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferStatus(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const decryptMessage = async (tokenId: bigint) => {
    try {
      setActiveDecrypt(tokenId);
      setDecryptStatus('');

      const nft = nfts.find(n => n.tokenId === Number(tokenId));
      if (!nft) {
        throw new Error('NFT not found.');
      }

      // Simulate decryption delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setDecryptedAttributes(prev => ({
        ...prev,
        [tokenId.toString()]: nft.message,
      }));
      setDecryptStatus('✅ Message decrypted!');
    } catch (error) {
      console.error('Decryption failed:', error);
      setDecryptStatus(error instanceof Error ? error.message : 'Decryption failed');
    } finally {
      setActiveDecrypt(null);
    }
  };

  return (
    <div className="hidden-app">
      <Header />
      <main className="hidden-content">
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px'
        }}>
          <strong>⚠️ TEST MODE ACTIVE:</strong> FHE encryption is disabled while Zama Relayer is down. 
          Messages are stored locally for testing only. Deploy to real contract when Zama is back online.
        </div>

        <div className="hidden-grid">
          <section className="section-card">
            <h2>Mint</h2>
            <p>Upload an image and enter a secret message to mint a fresh NFT under your wallet.</p>
            <form onSubmit={handleMint}>
              <div className="form-group">
                <label className="form-label">NFT Image</label>
                <ImageUpload
                  onImageSelect={(file) => {
                    setSelectedImage(file);
                  }}
                  onImageClear={() => {
                    setSelectedImage(null);
                  }}
                  disabled={minting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="attribute-value">
                  Hidden message
                </label>
                <input
                  id="attribute-value"
                  className="text-input"
                  value={mintValue}
                  onChange={event => setMintValue(event.target.value)}
                  placeholder="Enter a secret message"
                  autoComplete="off"
                  maxLength={100}
                  required
                />
              </div>
              <button className="primary-button" type="submit" disabled={minting || !hasWallet || !selectedImage}>
                {minting ? 'Minting…' : 'Mint encrypted NFT'}
              </button>
              {mintStatus && <p className="info-note">{mintStatus}</p>}
              {!hasWallet && <p className="info-note">Connect a wallet to mint.</p>}
            </form>
          </section>

          <section className="section-card">
            <h2>Transfer</h2>
            <p>Send an NFT and automatically share its decryption rights with the recipient.</p>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label className="form-label" htmlFor="transfer-token">
                  Token ID
                </label>
                <input
                  id="transfer-token"
                  className="text-input"
                  value={transferToken}
                  onChange={event => setTransferToken(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 1"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="transfer-address">
                  Recipient address
                </label>
                <input
                  id="transfer-address"
                  className="text-input"
                  value={transferAddress}
                  onChange={event => setTransferAddress(event.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  required
                />
              </div>
              <button
                className="secondary-button"
                type="submit"
                disabled={transferring || !hasWallet || transferToken.length === 0}
              >
                {transferring ? 'Transferring…' : 'Transfer token'}
              </button>
              {transferStatus && <p className="info-note">{transferStatus}</p>}
            </form>
          </section>
        </div>

        <section className="section-card">
          <h2>Your NFTs</h2>
          {!hasWallet && <div className="empty-state">Connect a wallet to load your tokens.</div>}
          {hasWallet && tokens.length === 0 && (
            <div className="empty-state">No NFTs yet. Mint one to get started.</div>
          )}

          {hasWallet && tokens.length > 0 && (
            <div className="token-grid">
              {nfts
                .filter(nft => nft.owner === address)
                .map(nft => {
                  const tokenId = BigInt(nft.tokenId);
                  const decrypted = decryptedAttributes[tokenId.toString()];
                  return (
                    <div key={nft.tokenId} className="nft-card">
                      <div className="nft-image-container">
                        <img
                          src={nft.imageUri}
                          alt={`NFT #${nft.tokenId}`}
                          className="nft-image"
                        />
                      </div>
                      <div className="nft-content">
                        <div className="nft-id">Token #{nft.tokenId}</div>
                        <div className="nft-attribute">
                          {decrypted ? (
                            <span className="status-badge">Message: {decrypted}</span>
                          ) : (
                            <span className="attribute-hidden">Message hidden</span>
                          )}
                        </div>
                        <button
                          className="primary-button"
                          onClick={() => decryptMessage(tokenId)}
                          disabled={activeDecrypt === tokenId}
                        >
                          {activeDecrypt === tokenId ? 'Decrypting…' : 'Decrypt message'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {decryptStatus && <p className="info-note">{decryptStatus}</p>}
        </section>
      </main>
    </div>
  );
}
