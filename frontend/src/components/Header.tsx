import { SimpleWalletButton } from './SimpleWalletButton';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div>
              <h1 className="header-title">Hidden Attribute NFT</h1>
              <p className="header-subtitle">Mint encrypted collectibles and reveal attributes securely</p>
            </div>
          </div>
          <SimpleWalletButton />
        </div>
      </div>
    </header>
  );
}
