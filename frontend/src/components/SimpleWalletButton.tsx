import { useSimpleWallet } from '../hooks/useSimpleWallet';
import '../styles/SimpleWalletButton.css';

export function SimpleWalletButton() {
  const { address, isConnected, isLoading, error, connect, disconnect } = useSimpleWallet();

  return (
    <div className="wallet-button-container">
      {error && <div className="wallet-error">{error}</div>}
      
      {isConnected && address ? (
        <div className="wallet-info">
          <span className="wallet-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button className="disconnect-btn" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          className="connect-btn" 
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : '💼 Connect Wallet'}
        </button>
      )}
    </div>
  );
}
