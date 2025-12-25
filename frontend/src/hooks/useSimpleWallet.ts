import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSimpleWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            setWallet({
              address: accounts[0].address,
              isConnected: true,
              isLoading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWallet({
            address: accounts[0],
            isConnected: true,
            isLoading: false,
            error: null,
          });
        } else {
          setWallet({
            address: null,
            isConnected: false,
            isLoading: false,
            error: null,
          });
        }
      });
    }
  }, []);

  const connect = async () => {
    setWallet(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        setWallet({
          address: accounts[0],
          isConnected: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  };

  const disconnect = () => {
    setWallet({
      address: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  };

  return {
    ...wallet,
    connect,
    disconnect,
  };
}
