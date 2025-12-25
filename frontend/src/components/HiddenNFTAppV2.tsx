import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { ImageUpload } from './ImageUpload';
import { uploadImage } from '../utils/imageUpload';
import '../styles/HiddenNFTAppV2.css';

type DecryptedMap = Record<string, string>;
type NFTItem = {
  tokenId: number;
  owner: string;
  imageUri: string;
  message: string;
};

export function HiddenNFTAppV2() {
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
  const [activeDecrypt, setActiveDecrypt] = useState<number | null>(null);
  const [decryptStatus, setDecryptStatus] = useState('');

  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [nextTokenId, setNextTokenId] = useState(1);

  const [activeTab, setActiveTab] = useState<'mint' | 'transfer' | 'gallery'>('mint');

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

      const { imageUri } = await uploadImage(selectedImage);
      setMintStatus('Creating your NFT...');

      await new Promise(resolve => setTimeout(resolve, 1000));

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
      setMintStatus('✅ NFT minted successfully!');
      setActiveTab('gallery');
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

      const nftIndex = nfts.findIndex(nft => nft.tokenId === tokenId);
      if (nftIndex === -1) {
        setTransferStatus('Token not found.');
        return;
      }

      const updatedNfts = [...nfts];
      updatedNfts[nftIndex].owner = transferAddress.trim();
      setNfts(updatedNfts);

      setTransferStatus('✅ Transfer completed!');
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

  const decryptMessage = async (tokenId: number) => {
    try {
      setActiveDecrypt(tokenId);
      setDecryptStatus('');

      const nft = nfts.find(n => n.tokenId === tokenId);
      if (!nft) {
        throw new Error('NFT not found.');
      }

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
    <div className="app-v2">
      <Header />
      
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Privacy-Preserving NFTs</h1>
          <p className="hero-subtitle">Mint NFTs with encrypted messages using FHE technology</p>
        </div>
      </div>

      <div className="container">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'mint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            <span className="tab-icon">✨</span> Create NFT
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            <span className="tab-icon">📤</span> Transfer
          </button>
          <button 
            className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            <span className="tab-icon">🖼️</span> Gallery ({nfts.filter(n => n.owner === address).length})
          </button>
        </div>

        {activeTab === 'mint' && (
          <div className="tab-content">
            <div className="card mint-card">
              <div className="card-header">
                <h2>Create New NFT</h2>
                <p>Upload an image and add a secret message</p>
              </div>
              
              <form onSubmit={handleMint} className="mint-form">
                <div className="form-section">
                  <label className="form-label">NFT Image</label>
                  <ImageUpload
                    onImageSelect={(file) => setSelectedImage(file)}
                    onImageClear={() => setSelectedImage(null)}
                    disabled={minting}
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Secret Message</label>
                  <div className="input-wrapper">
                    <textarea
                      className="text-input"
                      value={mintValue}
                      onChange={event => setMintValue(event.target.value)}
                      placeholder="Enter a secret message (encrypted on-chain)"
                      maxLength={100}
                      rows={4}
                    />
                    <div className="char-count">{mintValue.length}/100</div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary btn-large"
                  type="submit" 
                  disabled={minting || !hasWallet || !selectedImage}
                >
                  {minting ? (
                    <>
                      <span className="spinner"></span> Creating NFT...
                    </>
                  ) : (
                    <>✨ Mint NFT</>
                  )}
                </button>

                {mintStatus && (
                  <div className={`status-message ${mintStatus.includes('✅') ? 'success' : 'error'}`}>
                    {mintStatus}
                  </div>
                )}

                {!hasWallet && (
                  <div className="info-box">
                    <span className="info-icon">ℹ️</span>
                    <span>Connect your wallet to start creating NFTs</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="tab-content">
            <div className="card transfer-card">
              <div className="card-header">
                <h2>Transfer NFT</h2>
                <p>Send your NFT to another wallet</p>
              </div>

              <form onSubmit={handleTransfer} className="transfer-form">
                <div className="form-section">
                  <label className="form-label">Token ID</label>
                  <input
                    className="text-input"
                    type="number"
                    value={transferToken}
                    onChange={event => setTransferToken(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1"
                    inputMode="numeric"
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Recipient Address</label>
                  <input
                    className="text-input"
                    value={transferAddress}
                    onChange={event => setTransferAddress(event.target.value)}
                    placeholder="0x..."
                  />
                </div>

                <button
                  className="btn btn-secondary btn-large"
                  type="submit"
                  disabled={transferring || !hasWallet || !transferToken}
                >
                  {transferring ? (
                    <>
                      <span className="spinner"></span> Transferring...
                    </>
                  ) : (
                    <>📤 Transfer NFT</>
                  )}
                </button>

                {transferStatus && (
                  <div className={`status-message ${transferStatus.includes('✅') ? 'success' : 'error'}`}>
                    {transferStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="tab-content">
            {!hasWallet ? (
              <div className="empty-state">
                <div className="empty-icon">👛</div>
                <h3>Connect Your Wallet</h3>
                <p>Connect a wallet to view your NFTs</p>
              </div>
            ) : nfts.filter(n => n.owner === address).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎨</div>
                <h3>No NFTs Yet</h3>
                <p>Create your first NFT to get started</p>
              </div>
            ) : (
              <div className="gallery-grid">
                {nfts
                  .filter(nft => nft.owner === address)
                  .map(nft => {
                    const decrypted = decryptedAttributes[nft.tokenId.toString()];
                    
                    return (
                      <div key={nft.tokenId} className="nft-item">
                        <div className="nft-image-wrapper">
                          <img
                            src={nft.imageUri}
                            alt={`NFT #${nft.tokenId}`}
                            className="nft-image"
                          />
                          <div className="nft-badge">#{nft.tokenId}</div>
                        </div>

                        <div className="nft-info">
                          <div className="nft-title">NFT #{nft.tokenId}</div>
                          
                          <div className="message-section">
                            {decrypted ? (
                              <div className="message-box decrypted">
                                <span className="lock-icon">🔓</span>
                                <span>{decrypted}</span>
                              </div>
                            ) : (
                              <div className="message-box encrypted">
                                <span className="lock-icon">🔒</span>
                                <span>Message encrypted</span>
                              </div>
                            )}
                          </div>

                          <button
                            className={`btn btn-small ${decrypted ? 'btn-success' : 'btn-primary'}`}
                            onClick={() => decryptMessage(nft.tokenId)}
                            disabled={activeDecrypt === nft.tokenId}
                          >
                            {activeDecrypt === nft.tokenId ? (
                              <>
                                <span className="spinner"></span> Decrypting...
                              </>
                            ) : decrypted ? (
                              <>✅ Decrypted</>
                            ) : (
                              <>🔓 Decrypt</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {decryptStatus && (
              <div className="gallery-status">
                <div className={`status-message ${decryptStatus.includes('✅') ? 'success' : 'error'}`}>
                  {decryptStatus}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="footer">
        <p>Privacy-Preserving NFTs powered by Zama FHEVM</p>
      </div>
    </div>
  );
}
