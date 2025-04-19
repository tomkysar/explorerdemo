'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type NetworkContextType = {
  network: 'mainnet' | 'testnet';
  setNetwork: (network: 'mainnet' | 'testnet') => void;
};

const NetworkContext = createContext<NetworkContextType>({} as NetworkContextType);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<'mainnet' | 'testnet'>('mainnet');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load saved network from localStorage on component mount
    const savedNetwork = localStorage.getItem('network');
    if (savedNetwork === 'mainnet' || savedNetwork === 'testnet') {
      setNetworkState(savedNetwork);
    }
  }, []);

  const setNetwork = (newNetwork: 'mainnet' | 'testnet') => {
    setNetworkState(newNetwork);
    // Save network to localStorage whenever it changes
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('network', newNetwork);
    }
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>{children}</NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);