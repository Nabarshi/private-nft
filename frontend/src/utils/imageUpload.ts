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
  const previewUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

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
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image must be less than 10MB');
  }

  // Try Pinata first, fall back to base64
  try {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    if (apiKey) {
      return await uploadToPinata(file);
    }
  } catch (error) {
    console.warn('Pinata upload failed, using base64 fallback:', error);
  }

  // Fallback to base64
  return await uploadAsBase64(file);
}

/**
 * Convert IPFS URI to HTTP gateway URL for display
 */
export function getImageUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  return uri;
}
