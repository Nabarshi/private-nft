import { BrowserProvider } from 'ethers';
import { createInstance, initSDK, type FhevmInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/web';
import { CONTRACT_ADDRESS } from '../config/contracts';

let fhevmInstance: FhevmInstance | null = null;

/**
 * Initialize the FHEVM instance
 * This must be called once before encrypting any data
 */
export async function initializeFHE(): Promise<FhevmInstance> {
  if (fhevmInstance) {
    return fhevmInstance;
  }

  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    console.log('🔐 Initializing FHEVM SDK...');

    // Initialize the SDK (WASM modules)
    await initSDK();

    // Get network info
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log('Network:', network.name, 'Chain ID:', chainId);

    // Create FHEVM instance using Sepolia configuration
    fhevmInstance = await createInstance({
      ...SepoliaConfig,
      chainId,
    });

    console.log('✅ FHEVM instance created successfully');
    return fhevmInstance;
  } catch (error) {
    console.error('❌ Failed to initialize FHEVM:', error);
    throw error;
  }
}

/**
 * Encrypt a message using FHEVM
 * @param message The plain text message to encrypt
 * @returns Object containing encrypted message and input proof
 */
export async function encryptMessage(message: string): Promise<{
  encryptedMessage: `0x${string}`;
  inputProof: `0x${string}`;
}> {
  try {
    console.log('🔒 Encrypting message:', message);

    // Ensure FHEVM is initialized
    const instance = await initializeFHE();

    // Get user address
    const provider = new BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Convert message to BigInt (simple encoding)
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    
    // Convert first 32 bytes to BigInt
    let messageNum = BigInt(0);
    for (let i = 0; i < Math.min(messageBytes.length, 32); i++) {
      messageNum = messageNum | (BigInt(messageBytes[i]) << BigInt(i * 8));
    }

    console.log('Message as number:', messageNum.toString());

    // Create encrypted input
    const encryptedInput = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    
    // Add the uint256 value
    encryptedInput.add256(messageNum);
    
    // Get the encrypted data
    const encrypted = await encryptedInput.encrypt();

    console.log('✅ Message encrypted successfully');
    console.log('Encrypted handles:', encrypted.handles);
    console.log('Input proof:', encrypted.inputProof);

    // Convert Uint8Array to hex string
    const toHexString = (bytes: Uint8Array): `0x${string}` => {
      return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
    };

    // Return the first handle (our euint256) and the proof
    return {
      encryptedMessage: toHexString(encrypted.handles[0]),
      inputProof: toHexString(encrypted.inputProof),
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt message: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Check if FHE is initialized
 */
export function isFHEInitialized(): boolean {
  return fhevmInstance !== null;
}

/**
 * Note: Full FHE decryption requires Zama KMS integration
 * This is a placeholder for future implementation
 */
export async function decryptUint256(
  _encryptedHandle: string,
  _contractAddress: string
): Promise<string> {
  // TODO: Implement full FHE decryption with Zama KMS
  // For now, return a message indicating encryption is active
  throw new Error('FHE decryption requires Zama KMS integration. Message is securely encrypted on-chain.');
}
