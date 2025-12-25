import axios from 'axios';

export interface UploadResult {
  imageUri: string;
  previewUrl: string;
}

/**
 * Upload image to Pinata IPFS service
 * Requires VITE_PINATA_API_KEY and VITE_PINATA_API_SECRET environment variables
 */
async function uploadToPinata(file: File): Promise<UploadResult> {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
  });

  const ipfsHash = response.data.IpfsHash;
  const imageUri = `ipfs://${ipfsHash}`;
  
  // Use custom gateway if configured, otherwise use Pinata's public gateway
  const gateway = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
  const previewUrl = `${gateway}/ipfs/${ipfsHash}`;
  
  console.log('✅ Uploaded to IPFS:', ipfsHash);
  console.log('📷 Preview URL:', previewUrl);

  return { imageUri, previewUrl };
}

/**
 * Convert image to base64 data URI
 * This is a fallback when IPFS is not available
 */
async function uploadAsBase64(file: File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve({
        imageUri: base64String,
        previewUrl: base64String,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image file and return URI
 * Attempts Pinata IPFS first, falls back to base64 if credentials not configured
 * WARNING: Base64 on-chain storage is expensive! Use small images or configure Pinata.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB for IPFS
  if (file.size > maxSize) {
    throw new Error('Image must be less than 10MB');
  }

  // Try Pinata first, fall back to base64
  try {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    console.log('Pinata API Key configured:', apiKey ? 'YES ✅' : 'NO ❌');
    
    if (apiKey) {
      console.log('📤 Attempting IPFS upload via Pinata...');
      const result = await uploadToPinata(file);
      console.log('✅ IPFS upload successful:', result.imageUri);
      return result;
    } else {
      console.warn('⚠️ Pinata not configured, will use base64 fallback');
    }
  } catch (error) {
    console.error('❌ Pinata upload failed:', error);
    console.warn('Falling back to base64 encoding');
  }

  // For base64 fallback, enforce much stricter size limit (100KB)
  // Base64 on-chain storage is VERY expensive!
  const maxBase64Size = 100 * 1024; // 100KB
  if (file.size > maxBase64Size) {
    throw new Error(
      `Image too large for on-chain storage (${Math.round(file.size / 1024)}KB). ` +
      `Please use an image under 100KB, or configure Pinata IPFS in .env file. ` +
      `See .env.example for setup instructions.`
    );
  }

  console.warn(`⚠️ Using base64 on-chain storage for ${Math.round(file.size / 1024)}KB image. This is expensive! Configure Pinata for better performance.`);
  
  // Fallback to base64
  return await uploadAsBase64(file);
}

/**
 * Convert IPFS URI to HTTP gateway URL for display
 * Supports multiple gateways for better reliability
 */
export function getImageUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    // Use custom gateway if configured, otherwise use Pinata's public gateway
    const gateway = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
    return `${gateway}/ipfs/${hash}`;
  }
  return uri;
}
