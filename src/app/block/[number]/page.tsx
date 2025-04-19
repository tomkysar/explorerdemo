// src/app/address/[address]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useNetwork } from '@/contexts/NetworkContext';
import { getAddressInfo, getAddressCounters, getAddressTransactions } from '@/utils/api';
import { formatEther } from 'ethers';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import Link from 'next/link';

export default function AddressPage() {
  const { network } = useNetwork();
  const router = useRouter();
  const { address } = useParams();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  
  const [details, setDetails] = useState<{ 
    balance?: string; 
    nonce?: number; 
    transactionCount?: number;
  }>({});
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPageParams, setNextPageParams] = useState<any>(null);
  const [prevPageMap, setPrevPageMap] = useState<Record<number, any>>({});

  useEffect(() => {
    const fetchAddressDetails = async () => {
      try {
        setLoading(true);
        const [addressInfo, addressCounters] = await Promise.all([
          getAddressInfo(address as string),
          getAddressCounters(address as string),
        ]);

        const txCount = parseInt(addressCounters.transactions_count || '0');
        const pages = Math.ceil(txCount / 10);

        setDetails({
          balance: formatEther(addressInfo.coin_balance || '0'),
          nonce: parseInt(addressInfo.nonce || '0'),
          transactionCount: txCount,
        });
        
        setTotalPages(pages || 1);
      } catch (error) {
        console.error('Error fetching address details:', error);
        setError('Failed to load address details');
      } finally {
        setLoading(false);
      }
    };

    const fetchTransactions = async () => {
      try {
        setTxLoading(true);
        const params: any = { 
          limit: '10',
        };
        
        // Handle pagination
        if (currentPage > 1) {
          // Get stored pagination params for the previous page
          const prevParams = prevPageMap[currentPage - 1];
          if (prevParams) {
            params.items_count = prevParams.items_count;
            params.block_number = prevParams.block_number;
          } else {
            // If direct access to a page without having the previous page info
            // Start from page 1 and navigate through pages
            let txData = await getAddressTransactions(address as string, { limit: '10' });
            let page = 1;

            while (page < currentPage - 1 && txData.next_page_params) {
              setPrevPageMap(prev => ({
                ...prev, 
                [page]: txData.next_page_params
              }));
              
              const nextParams = {
                limit: '10',
                items_count: txData.next_page_params.items_count.toString(),
                block_number: txData.next_page_params.block_number.toString()
              };
              
              txData = await getAddressTransactions(address as string, nextParams);
              page++;
            }
            
            if (txData.next_page_params) {
              setPrevPageMap(prev => ({
                ...prev, 
                [page]: txData.next_page_params
              }));
              
              params.items_count = txData.next_page_params.items_count.toString();
              params.block_number = txData.next_page_params.block_number.toString();
            }
          }
        }
        
        const txData = await getAddressTransactions(address as string, params);
        setTransactions(txData.items || []);
        setNextPageParams(txData.next_page_params);
        
        // Store pagination data for future use
        if (txData.next_page_params) {
          setPrevPageMap(prev => ({
            ...prev, 
            [currentPage]: txData.next_page_params
          }));
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTxLoading(false);
      }
    };

    if (address) {
      fetchAddressDetails();
      fetchTransactions();
    }
  }, [address, network, currentPage, prevPageMap]);

  // Format a hash for display (0x1234...5678)
  const formatHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
  };

  // Get transaction direction relative to current address
  const getDirection = (tx: any) => {
    if (!tx.from || !tx.to) return 'out';
    
    const fromAddress = tx.from.hash?.toLowerCase();
    const toAddress = tx.to.hash?.toLowerCase();
    const viewedAddress = (address as string).toLowerCase();
    
    if (fromAddress === viewedAddress && toAddress === viewedAddress) {
      return 'self';
    } else if (fromAddress === viewedAddress) {
      return 'out';
    } else if (toAddress === viewedAddress) {
      return 'in';
    }
    
    return 'unknown';
  };

  // Format time ago string from timestamp
  const getTimeAgo = (timestamp: string) => {
    if (!timestamp) return '';
    
    const txDate = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - txDate.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds} secs ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hrs ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
  };

  // Navigate to a different page
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    // Use router for client-side navigation
    router.push(`/address/${address}?page=${pageNumber}`);
  };

  return (
    <div className="min-h-screen bg-[#0D1114] p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton />
        <h1 className="text-2xl mb-4">Address Details</h1>

        <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-6 mb-6">
          <div className="space-y-4">
            {error ? (
              <div className="text-red-400">{error}</div>
            ) : loading ? (
              <div className="text-gray-400">Loading address details...</div>
            ) : (
              <>
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <div className="text-gray-400">Address:</div>
                  <div className="break-all">{address}</div>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <div className="text-gray-400">Balance:</div>
                  <div className="break-all">{details.balance} HYPE</div>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <div className="text-gray-400">Nonce:</div>
                  <div>{details.nonce}</div>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <div className="text-gray-400">Transactions:</div>
                  <div>{details.transactionCount || 0}</div>
                </div>
              </>
            )}
          </div>
        </div>

        <h2 className="text-xl mb-4">Transactions</h2>
        <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-6">
          {txLoading ? (
            <div className="text-center text-gray-400 py-4">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left border-b border-[#2B3238]">
                    <th className="py-3 px-2 text-gray-400">Txn Hash</th>
                    <th className="py-3 px-2 text-gray-400">Block</th>
                    <th className="py-3 px-2 text-gray-400">From/To</th>
                    <th className="py-3 px-2 text-right text-gray-400">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => {
                    const direction = getDirection(tx);
                    return (
                      <tr key={tx.hash} className="border-b border-[#2B3238] hover:bg-[#1A1F23]">
                        <td className="py-3 px-2">
                          <Link href={`/tx/${tx.hash}`} className="text-[#51d2c1] hover:underline">
                            {formatHash(tx.hash)}
                          </Link>
                        </td>
                        
                        <td className="py-3 px-2">
                          <Link href={`/block/${tx.block}`} className="text-gray-300 hover:underline">
                            {tx.block}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {getTimeAgo(tx.timestamp)}
                          </div>
                        </td>
                        
                        <td className="py-3 px-2">
                          {direction === 'in' ? (
                            <div>
                              <span className="inline-block px-2 py-1 text-xs rounded bg-[#1c3938] text-[#3DD8AF] mr-2">IN</span>
                              <span className="text-gray-400">From </span>
                              <Link
                                href={`/address/${tx.from?.hash}`}
                                className="text-gray-300 hover:text-[#51d2c1] hover:underline"
                              >
                                {formatHash(tx.from?.hash)}
                              </Link>
                            </div>
                          ) : direction === 'out' ? (
                            <div>
                              <span className="inline-block px-2 py-1 text-xs rounded bg-[#392d2d] text-[#E37D72] mr-2">OUT</span>
                              <span className="text-gray-400">To </span>
                              {tx.to ? (
                                <Link
                                  href={`/address/${tx.to?.hash}`}
                                  className="text-gray-300 hover:text-[#51d2c1] hover:underline"
                                >
                                  {formatHash(tx.to?.hash)}
                                </Link>
                              ) : (
                                <span className="text-gray-300">Contract Creation</span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-block px-2 py-1 text-xs rounded bg-[#322c39] text-[#B987DC] mr-2">SELF</span>
                              <span className="text-gray-300">Self Transaction</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="py-3 px-2 text-right">
                          {parseFloat(formatEther(tx.value || '0')).toFixed(8)} HYPE
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4 py-3">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex space-x-1">
                  {/* First Page */}
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                  >
                    First
                  </button>
                  
                  {/* Previous Page */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                  >
                    Prev
                  </button>
                  
                  {/* Page number indicator */}
                  <div className="px-3 py-1 text-gray-300">
                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                  </div>
                  
                  {/* Next Page */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || !nextPageParams}
                    className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                  >
                    Next
                  </button>
                  
                  {/* Last Page */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}