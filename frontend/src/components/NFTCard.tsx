import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { getImageUrl } from '../utils/imageUpload';
import '../styles/NFTCard.css';

interface NFTCardProps {
  tokenId: bigint;
  decryptedMessage?: string;
  isDecrypting: boolean;
  onDecrypt: () => void;
  disabled?: boolean;
}

export function NFTCard({ tokenId, decryptedMessage, isDecrypting, onDecrypt, disabled }: NFTCardProps) {
  const publicClient = usePublicClient();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loadingImage, setLoadingImage] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchImageUri = async () => {
      if (!publicClient) return;

      try {
        setLoadingImage(true);
        const uri = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getTokenImageURI',
          args: [tokenId],
        })) as string;

        setImageUrl(getImageUrl(uri));
        setImageError(false);
      } catch (error) {
        console.error('Failed to fetch image URI:', error);
        setImageError(true);
      } finally {
        setLoadingImage(false);
      }
    };

    fetchImageUri();
  }, [tokenId, publicClient]);

  return (
    <div className="nft-card">
      <div className="nft-image-container">
        {loadingImage ? (
          <div className="nft-image-placeholder">
            <div className="loading-spinner"></div>
          </div>
        ) : imageError || !imageUrl ? (
          <div className="nft-image-placeholder">
            <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="placeholder-text">No image</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`NFT #${tokenId.toString()}`}
            className="nft-image"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="nft-content">
        <div className="nft-id">Token #{tokenId.toString()}</div>
        <div className="nft-attribute">
          {decryptedMessage ? (
            <span className="status-badge">Message: {decryptedMessage}</span>
          ) : (
            <span className="attribute-hidden">Message hidden</span>
          )}
        </div>
        <button
          className="primary-button"
          onClick={onDecrypt}
          disabled={isDecrypting || disabled}
        >
          {isDecrypting ? 'Decrypting…' : 'Decrypt attribute'}
        </button>
      </div>
    </div>
  );
}
