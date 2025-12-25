import { useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';

import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { Header } from './Header';
import { ImageUpload } from './ImageUpload';
import { NFTCard } from './NFTCard';
import { uploadImage } from '../utils/imageUpload';

import '../styles/HiddenNFTApp.css';

type DecryptedMap = Record<string, string>;

const ZERO_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function HiddenNFTApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { instance, isLoading: instanceLoading, error: instanceError } = useZamaInstance();
  const signerPromise = useEthersSigner();

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

  const { data: tokensData, refetch: refetchTokens, isFetching: fetchingTokens } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokensOfOwner',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const tokens = Array.isArray(tokensData) ? (tokensData as bigint[]) : [];
  const hasWallet = Boolean(isConnected && address);

  const handleMint = async (event: React.FormEvent) => {
    event.preventDefault();
    setMintStatus('');

    if (!hasWallet || !instance) {
      setMintStatus('Connect a wallet and wait for encryption to be ready.');
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

      // Upload image first
      const { imageUri } = await uploadImage(selectedImage);
      setMintStatus('Image uploaded. Encrypting message...');

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      // Encrypt the message as a string (converted to bytes)
      input.addString(mintValue);
      const encrypted = await input.encrypt();

      setMintStatus('Minting NFT...');
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable');
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mint(encrypted.handles[0], encrypted.inputProof, imageUri);
      await tx.wait();

      setMintValue('');
      setSelectedImage(null);
      setMintStatus('Minted successfully.');
      await refetchTokens();
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

    let tokenId: bigint;
    try {
      tokenId = BigInt(transferToken);
    } catch (error) {
      setTransferStatus('Enter a valid token id.');
      return;
    }

    try {
      setTransferring(true);

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable');
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.transferFrom(address, transferAddress.trim(), tokenId);
      await tx.wait();

      setTransferStatus('Transfer completed.');
      setTransferToken('');
      setTransferAddress('');
      setDecryptedAttributes(prev => {
        const updated = { ...prev };
        delete updated[tokenId.toString()];
        return updated;
      });
      await refetchTokens();
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferStatus(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const decryptMessage = async (tokenId: bigint) => {
    if (!instance || !hasWallet || !publicClient) {
      setDecryptStatus('Encryption service is not ready.');
      return;
    }

    try {
      setActiveDecrypt(tokenId);
      setDecryptStatus('');

      const handle = (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'getEncryptedMessage',
        args: [tokenId],
      })) as string;

      if (!handle || handle === '0x' || handle === '0x00') {
        throw new Error('Message is empty for this token.');
      }

      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        [
          {
            handle,
            contractAddress: CONTRACT_ADDRESS,
          },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace(/^0x/, ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const decryptedValue = result[handle];
      if (!decryptedValue) {
        throw new Error('Decryption did not return a value.');
      }

      setDecryptedAttributes(prev => ({
        ...prev,
        [tokenId.toString()]: decryptedValue,
      }));
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
        {instanceError && <div className="error-banner">{instanceError}</div>}

        <div className="hidden-grid">
          <section className="section-card">
            <h2>Mint</h2>
            <p>Upload an image and encrypt a secret message to mint a fresh NFT under your wallet.</p>
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
              <button className="primary-button" type="submit" disabled={minting || !hasWallet || instanceLoading || !selectedImage}>
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
          {hasWallet && fetchingTokens && <div className="empty-state">Loading tokens…</div>}
          {hasWallet && !fetchingTokens && tokens.length === 0 && (
            <div className="empty-state">No NFTs yet. Mint one to get started.</div>
          )}

          {hasWallet && tokens.length > 0 && (
            <div className="token-grid">
              {tokens.map(tokenId => (
                <NFTCard
                  key={tokenId.toString()}
                  tokenId={tokenId}
                  decryptedMessage={decryptedAttributes[tokenId.toString()]}
                  isDecrypting={activeDecrypt === tokenId}
                  onDecrypt={() => decryptMessage(tokenId)}
                  disabled={instanceLoading}
                />
              ))}
            </div>
          )}

          {decryptStatus && <p className="info-note">{decryptStatus}</p>}
        </section>
      </main>
    </div>
  );
}

