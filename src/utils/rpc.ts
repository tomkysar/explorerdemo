// src/utils/rpc.ts
import { createPublicClient, http } from 'viem';

const RPC_URLS = {
  mainnet: 'https://rpc.hyperliquid.xyz/evm',
  testnet: 'https://rpc.hyperliquid-testnet.xyz/evm',
};

// Keep this for operations that still need direct RPC access
export const getPublicClient = (network: 'mainnet' | 'testnet') => {
  return createPublicClient({
    transport: http(RPC_URLS[network], {
      fetchOptions: {
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    }),
  });
};

// Add this to get the correct RPC URL
export const getRpcUrl = (network: 'mainnet' | 'testnet') => {
  return RPC_URLS[network];
};