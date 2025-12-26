import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { Header } from './Header';
import { ImageUpload } from './ImageUpload';
import { uploadImage, getImageUrl } from '../utils/imageUpload';
import { encryptMessage, initializeFHE, decryptUint256 } from '../utils/fheEncryption';
import { useSimpleWallet } from '../hooks/useSimpleWallet';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/HiddenNFTAppV2.css';

type DecryptedMap = Record<string, string>;
type NFTItem = {
  tokenId: number;
  owner: string;
  imageUri: string;
  message: string;
};

export function HiddenNFTAppV2Simple() {
  const wallet = useSimpleWallet();

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
  const [activeTab, setActiveTab] = useState<'mint' | 'transfer' | 'gallery'>('mint');
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // Initialize FHE when wallet connects
  useEffect(() => {
    if (wallet.isConnected) {
      initializeFHE().catch(err => {
        console.error('Failed to initialize FHE:', err);
        setMintStatus('⚠️ FHE initialization failed. Check console for details.');
      });
    }
  }, [wallet.isConnected]);

  // Load NFTs when wallet connects or tab changes to gallery
  useEffect(() => {
    if (wallet.isConnected && wallet.address && activeTab === 'gallery') {
      loadNFTs();
    }
  }, [wallet.isConnected, wallet.address, activeTab]);

  // Function to load NFTs from blockchain
  const loadNFTs = async () => {
    if (!wallet.address) return;

    try {
      setLoadingNFTs(true);
      const provider = new BrowserProvider(window.ethereum!);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Get token IDs owned by user
      const tokenIds = await contract.tokensOfOwner(wallet.address) as bigint[];

      // Load details for each token
      const nftPromises = tokenIds.map(async (tokenId) => {
        const imageUri = await contract.getTokenImageURI(tokenId);
        // Note: Messages are encrypted on-chain, we'll show them as encrypted
        return {
          tokenId: Number(tokenId),
          owner: wallet.address!,
          imageUri: imageUri as string,
          message: '[Encrypted on-chain with FHE]',
        };
      });

      const loadedNFTs = await Promise.all(nftPromises);
      setNfts(loadedNFTs);
      console.log('✅ Loaded', loadedNFTs.length, 'NFTs');
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setLoadingNFTs(false);
    }
  };

  const ZERO_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

  const handleMint = async (event: React.FormEvent) => {
    event.preventDefault();
    setMintStatus('');

    if (!wallet.isConnected || !wallet.address) {
      setMintStatus('💼 Please connect your wallet first.');
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
      setMintStatus('📤 Uploading image...');
      const { imageUri } = await uploadImage(selectedImage);
      
      setMintStatus('🔐 Encrypting message with FHE...');
      const { encryptedMessage, inputProof } = await encryptMessage(mintValue);
      
      setMintStatus('🙋 Awaiting wallet confirmation...');

      // Get contract instance
      const provider = new BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call FHE mint function with encrypted parameters
      const tx = await contract.mint(encryptedMessage, inputProof, imageUri);
      
      setMintStatus('⏳ Waiting for blockchain confirmation... Check Etherscan for your transaction.');
      const receipt = await tx.wait();
      
      if (receipt) {
        // Extract tokenId from mint event
        const tokenId = receipt.logs[0]?.topics[3];
        if (tokenId) {
          // Store original message locally so user can see it
          const tokenIdNum = Number(tokenId);
          localStorage.setItem(`nft_message_${wallet.address}_${tokenIdNum}`, mintValue);
          console.log('💾 Stored message locally for token', tokenIdNum);
        }
        
        setMintStatus('✅ NFT minted successfully! Check Etherscan for your transaction.');
        setMintValue('');
        setSelectedImage(null);
        setActiveTab('gallery');
        // Reload NFTs to show the new one
        setTimeout(() => loadNFTs(), 2000);
      }
    } catch (error: any) {
      console.error('Mint failed:', error);
      setMintStatus('❌ ' + (error.reason || error.message || 'Mint failed'));
    } finally {
      setMinting(false);
    }
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setTransferStatus('');

    if (!wallet.isConnected || !wallet.address) {
      setTransferStatus('💼 Please connect your wallet first.');
      return;
    }

    if (!ZERO_ADDRESS.test(transferAddress.trim())) {
      setTransferStatus('Enter a valid Ethereum address (0x...)');
      return;
    }

    let tokenId: number;
    try {
      tokenId = Number(transferToken);
      if (!Number.isInteger(tokenId) || tokenId < 0) {
        throw new Error('Invalid token ID');
      }
    } catch (error) {
      setTransferStatus('Enter a valid token ID (must be a number)');
      return;
    }

    try {
      setTransferring(true);
      setTransferStatus('🙋 Awaiting wallet confirmation...');

      // Get contract instance
      const provider = new BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call transferFrom function
      const tx = await contract.transferFrom(wallet.address, transferAddress, tokenId);
      
      setTransferStatus('⏳ Transaction submitted! Waiting for confirmation...');
      const receipt = await tx.wait();
      
      if (receipt) {
        setTransferStatus('✅ Transfer completed! Check Etherscan for your transaction.');
        setTransferToken('');
        setTransferAddress('');
      }
    } catch (error: any) {
      console.error('Transfer failed:', error);
      setTransferStatus('❌ ' + (error.reason || error.message || 'Transfer failed'));
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
        throw new Error('NFT not found');
      }

      // First, check localStorage for the original message
      const localMessage = localStorage.getItem(`nft_message_${wallet.address}_${tokenId}`);
      if (localMessage) {
        setDecryptedAttributes(prev => ({
          ...prev,
          [tokenId.toString()]: localMessage,
        }));
        setDecryptStatus('✅ Message revealed from local storage!');
        setActiveDecrypt(null);
        return;
      }

      setDecryptStatus('🔐 Decrypting with FHE...');

      // Get the encrypted message from contract
      const provider = new BrowserProvider(window.ethereum!);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Get encrypted handle
      const encryptedHandle = await contract.getEncryptedMessage(tokenId);
      
      console.log('Encrypted handle:', encryptedHandle);

      // Attempt to decrypt
      try {
        const decryptedMessage = await decryptUint256(encryptedHandle, CONTRACT_ADDRESS);
        setDecryptedAttributes(prev => ({
          ...prev,
          [tokenId.toString()]: decryptedMessage,
        }));
        setDecryptStatus('✅ Message decrypted!');
      } catch (decryptError: any) {
        // Show that message is encrypted
        setDecryptedAttributes(prev => ({
          ...prev,
          [tokenId.toString()]: '🔒 Message encrypted on-chain. Only owner with local key can view.',
        }));
        setDecryptStatus('ℹ️ Message is FHE-encrypted on blockchain');
      }
    } catch (error: any) {
      console.error('Reveal failed:', error);
      setDecryptStatus('❌ ' + (error.message || 'Reveal failed'));
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
          <p className="hero-subtitle">Mint NFTs with images on Sepolia Testnet</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '8px' }}>
            🔗 Real blockchain transactions • 📊 View on Etherscan • 🏗️ Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
          </p>
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
            <span className="tab-icon">🖼️</span> Gallery ({nfts.filter(n => n.owner === wallet.address).length})
          </button>
        </div>

        {activeTab === 'mint' && (
          <div className="tab-content">
            <div className="card mint-card">
              <div className="card-header">
                <h2>Create New NFT</h2>
                <p>Upload an image and add a message. Real transaction on Sepolia blockchain.</p>
              </div>
              
              <form onSubmit={handleMint} className="mint-form">
                <div className="form-section">
                  <label className="form-label">NFT Image</label>
                  <ImageUpload
                    onImageSelect={(file) => setSelectedImage(file)}
                    onImageClear={() => setSelectedImage(null)}
                    disabled={minting || !wallet.isConnected}
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Message</label>
                  <div className="input-wrapper">
                    <textarea
                      className="text-input"
                      value={mintValue}
                      onChange={event => setMintValue(event.target.value)}
                      placeholder="Enter a message for this NFT"
                      maxLength={100}
                      rows={4}
                      disabled={minting || !wallet.isConnected}
                    />
                    <div className="char-count">{mintValue.length}/100</div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary btn-large"
                  type="submit" 
                  disabled={minting || !wallet.isConnected || !selectedImage}
                >
                  {minting ? (
                    <>
                      <span className="spinner"></span> Confirming...
                    </>
                  ) : (
                    <>🏗️ Mint on Sepolia</>
                  )}
                </button>

                {mintStatus && (
                  <div className={`status-message ${mintStatus.includes('✅') ? 'success' : 'error'}`}>
                    {mintStatus}
                  </div>
                )}

                {!wallet.isConnected && (
                  <div className="info-box">
                    <span className="info-icon">ℹ️</span>
                    <span>Connect your MetaMask wallet to Sepolia testnet to mint NFTs</span>
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
                <p>Send your NFT to another address on Sepolia</p>
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
                    disabled={transferring || !wallet.isConnected}
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Recipient Address</label>
                  <input
                    className="text-input"
                    value={transferAddress}
                    onChange={event => setTransferAddress(event.target.value)}
                    placeholder="0x..."
                    disabled={transferring || !wallet.isConnected}
                  />
                </div>

                <button
                  className="btn btn-secondary btn-large"
                  type="submit"
                  disabled={transferring || !wallet.isConnected || !transferToken}
                >
                  {transferring ? (
                    <>
                      <span className="spinner"></span> Confirming...
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
            {!wallet.isConnected ? (
              <div className="empty-state">
                <div className="empty-icon">👛</div>
                <h3>Connect Your Wallet</h3>
                <p>Connect MetaMask to view your NFTs</p>
              </div>
            ) : loadingNFTs ? (
              <div className="empty-state">
                <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
                <h3>Loading Your NFTs...</h3>
                <p>Fetching from blockchain</p>
              </div>
            ) : nfts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎨</div>
                <h3>No NFTs Yet</h3>
                <p>Create your first NFT to get started</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('mint')}>
                  ✨ Mint Your First NFT
                </button>
              </div>
            ) : (
              <div className="gallery-grid">
                {nfts.map(nft => {
                  const decrypted = decryptedAttributes[nft.tokenId.toString()];
                  
                  return (
                    <div key={nft.tokenId} className="nft-item">
                      <div className="nft-image-wrapper">
                        <img
                          src={getImageUrl(nft.imageUri)}
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
                              <span>Message hidden</span>
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
                              <span className="spinner"></span> Revealing...
                            </>
                          ) : decrypted ? (
                            <>✅ Revealed</>
                          ) : (
                            <>🔓 Reveal</>
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
        <p>Real NFTs on Sepolia • Direct MetaMask connection</p>
      </div>
    </div>
  );
}
