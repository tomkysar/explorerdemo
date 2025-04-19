// src/hooks/useLatestBlocks.ts (updated version)
import { useQuery } from '@tanstack/react-query';
import { getMainPageBlocks, getMainPageTransactions } from '@/utils/api';
import { Transaction } from '@/types/transaction';

export const useLatestBlocks = (network: 'mainnet' | 'testnet') => {
  // Fetch latest blocks
  const { 
    data: blocksData, 
    isLoading: isBlocksLoading, 
    error: blocksError 
  } = useQuery({
    queryKey: ['main-page-blocks', network],
    queryFn: async () => {
      return getMainPageBlocks();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch latest transactions
  const { 
    data: transactionsData, 
    isLoading: isTransactionsLoading,
    error: transactionsError
  } = useQuery({
    queryKey: ['main-page-transactions', network],
    queryFn: async () => {
      return getMainPageTransactions();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Transform API responses to match expected format
  const blocks = blocksData?.items?.map((block: any) => ({
    block: {
      number: parseInt(block.block_number),
      timestamp: block.timestamp,
      transactions: new Array(parseInt(block.transactions_count || '0')),
      baseFeePerGas: block.base_fee_per_gas,
    },
    transactions: [],
  })) || [];

  const transactions = transactionsData?.items?.map((tx: any) => ({
    hash: tx.hash as `0x${string}`,
    from: tx.from.hash as `0x${string}`,
    to: tx.to?.hash as `0x${string}` || null,
    value: BigInt(tx.value || '0'),
    blockNumber: BigInt(tx.block),
    input: tx.raw_input || '0x',
  })) || [];

  const isLoading = isBlocksLoading || isTransactionsLoading;
  const error = blocksError || transactionsError;

  return {
    blocks,
    transactions,
    isLoading,
    isFetching: isLoading,
    error: error as Error | null,
  };
};