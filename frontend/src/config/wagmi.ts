import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// Local development configuration - uses MetaMask directly
// No WalletConnect ID needed
export const config = getDefaultConfig({
  appName: 'FHE-NFT Minter',
  projectId: 'fhe-nft-local-dev', // Local development placeholder
  chains: [sepolia],
  ssr: false,
});
