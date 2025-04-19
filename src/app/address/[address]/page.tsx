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
  const router = useRouter();
  const { network } = useNetwork();
  const { address } = useParams();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  
  const [details, setDetails] = useState({ 
    balance: '', 
    nonce: 0, 
    transactionCount: 0,
    firstTransaction: null,
    lastTransaction: null
  });
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [nextPageParams, setNextPageParams] = useState(null);
  
  // Real values for new UI elements
  const [hypePrice, setHypePrice] = useState(0);
  const [tokenValue, setTokenValue] = useState(0);
  const [spotBalance, setSpotBalance] = useState(0);
  const [perpsBalance, setPerpsBalance] = useState(0);
  const [selectedToken, setSelectedToken] = useState("");

  // Format number with commas
  const formatNumberWithCommas = (number: number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Format HYPE balance to 8 decimal places
  const formatHypeBalance = (balance: string) => {
    if (!balance) return '0.00000000';
    try {
      // Extract only the numerical part, preserving 8 decimal places
      const truncated = parseFloat(balance).toFixed(8);
      // Format with commas for thousands separator
      const parts = truncated.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    } catch (error) {
      console.error('Error formatting HYPE balance:', error);
      return '0.00000000';
    }
  };
  
  // Format USD value with dollar sign, commas and 2 decimal places
  const formatUsdValue = (value: string) => {
    if (!value) return '$0.00';
    const numValue = parseFloat(value);
    return '$' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  const formatBalance = (number: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  };

  const formatCurrency = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  const formatValue = (value: string) => {
    const numValue = parseFloat(value);
    return formatBalance(numValue);
  };

  useEffect(() => {
    async function fetchAddressData() {
      try {
        setLoading(true);
        
        // Fetch address details
        const [addressInfo, addressCounters] = await Promise.all([
          getAddressInfo(address),
          getAddressCounters(address),
        ]);

        const txCount = parseInt(addressCounters.transactions_count || '0');
        const totalPages = Math.ceil(txCount / 10);

        const balance = formatEther(addressInfo.coin_balance || '0');
        
        // Get nonce from last outbound transaction if available
        let lastNonce = 0;
        try {
          const outboundTxParams = { 
            limit: '1',
            filter: 'from',  // Assuming API supports filtering by from address
          };
          
          const outboundTxData = await getAddressTransactions(address, outboundTxParams);
          if (outboundTxData?.items?.length > 0 && outboundTxData.items[0].nonce) {
            lastNonce = parseInt(outboundTxData.items[0].nonce);
          } else {
            lastNonce = parseInt(addressInfo.nonce || '0');
          }
        } catch (nonceError) {
          console.error('Error fetching last outbound transaction nonce:', nonceError);
          lastNonce = parseInt(addressInfo.nonce || '0');
        }
        
        setDetails({
          balance: balance,
          nonce: lastNonce,
          transactionCount: txCount,
          firstTransaction: null,
          lastTransaction: null
        });
        
        setPageCount(totalPages);
        
        // Fetch HYPE price from DeFiLlama API
        try {
          const response = await fetch('https://coins.llama.fi/prices/current/coingecko:hyperliquid?searchWidth=4h');
          const data = await response.json();
          
          if (data.coins && data.coins['coingecko:hyperliquid']) {
            const price = data.coins['coingecko:hyperliquid'].price;
            setHypePrice(price);
            
            // Calculate USD value
            const balanceFloat = parseFloat(balance);
            const usdValue = balanceFloat * price;
            setTokenValue(usdValue);
          }
        } catch (priceError) {
          console.error('Error fetching HYPE price:', priceError);
          setTokenValue(0);
        }
        
        // Fetch Hyperliquid L1 balances
        try {
          // Spot balance API call for user's token balances
          const spotResponse = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: "spotClearinghouseState",
              user: address
            })
          });
          
          const spotData = await spotResponse.json();
          if (spotData && spotData.balances) {
            // Sum all token totals converted to USDC
            let totalSpotBalance = 0;
            
            spotData.balances.forEach(balance => {
              totalSpotBalance += parseFloat(balance.total || 0);
            });
            
            setSpotBalance(totalSpotBalance);
          }
          
          // Perps balance API call for user's perpetuals account summary
          const perpsResponse = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: "clearinghouseState",
              user: address
            })
          });
          
          const perpsData = await perpsResponse.json();
          if (perpsData && perpsData.withdrawable) {
            setPerpsBalance(parseFloat(perpsData.withdrawable));
          }
        } catch (balanceError) {
          console.error('Error fetching Hyperliquid balances:', balanceError);
        }
        
        // Fetch first/last transaction timestamps if they are not already set
        fetchTransactionTimestamps();
      } catch (error) {
        console.error('Error fetching address details:', error);
        setError('Failed to load address details');
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchTransactionTimestamps() {
      try {
        // Only fetch if we don't already have the timestamps
        if (!details.firstTransaction || !details.lastTransaction) {
          // Get the most recent transaction for last timestamp
          const recentParams = { limit: '1' };
          const recentTxData = await getAddressTransactions(address, recentParams);
          
          if (recentTxData?.items?.length > 0) {
            setDetails(prev => ({
              ...prev,
              lastTransaction: recentTxData.items[0].timestamp
            }));
          }
          
          // Get the oldest transaction for first timestamp
          const oldestParams = { 
            limit: '1',
            sort: 'asc',  // assuming API supports this for oldest first
          };
          
          const oldestTxData = await getAddressTransactions(address, oldestParams);
          if (oldestTxData?.items?.length > 0) {
            setDetails(prev => ({
              ...prev,
              firstTransaction: oldestTxData.items[0].timestamp
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching transaction timestamps:', error);
      }
    }
    
    // This function fetches only the transactions for the current page
    async function fetchTransactionsForPage() {
      try {
        setTxLoading(true);
        const params = { 
          limit: '10',
        };
        
        const currentPage = page || 1;
        
        if (currentPage > 1) {
          const storedParams = localStorage.getItem(`address_${address}_page_${currentPage - 1}`);
          if (storedParams) {
            const parsedParams = JSON.parse(storedParams);
            params.items_count = parsedParams.items_count;
            params.block_number = parsedParams.block_number;
          }
        }
        
        const txData = await getAddressTransactions(address, params);
        
        const limitedTransactions = txData?.items?.slice(0, 10) || [];
        setTransactions(limitedTransactions);
        
        setNextPageParams(txData?.next_page_params);
        
        if (txData?.next_page_params) {
          localStorage.setItem(`address_${address}_page_${currentPage}`, 
            JSON.stringify(txData.next_page_params));
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTxLoading(false);
      }
    }

    if (address) {
      // Only fetch address data when the address changes
      fetchAddressData();
    }
  }, [address, network]); // Remove 'page' from dependencies

  // Separate useEffect for page changes
  useEffect(() => {
    async function fetchTransactionsForPage() {
      try {
        setTxLoading(true);
        const params = { 
          limit: '10',
        };
        
        const currentPage = page || 1;
        
        if (currentPage > 1) {
          const storedParams = localStorage.getItem(`address_${address}_page_${currentPage - 1}`);
          if (storedParams) {
            const parsedParams = JSON.parse(storedParams);
            params.items_count = parsedParams.items_count;
            params.block_number = parsedParams.block_number;
          }
        }
        
        const txData = await getAddressTransactions(address, params);
        
        const limitedTransactions = txData?.items?.slice(0, 10) || [];
        setTransactions(limitedTransactions);
        
        setNextPageParams(txData?.next_page_params);
        
        if (txData?.next_page_params) {
          localStorage.setItem(`address_${address}_page_${currentPage}`, 
            JSON.stringify(txData.next_page_params));
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTxLoading(false);
      }
    }

    if (address) {
      // Only fetch transactions when page changes
      fetchTransactionsForPage();
    }
  }, [address, page]); // Only depend on address and page

  // Format time ago
  const getTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return '';
    
    const txDate = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - txDate.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds} secs`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins`;
    if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)} hrs`;
    }
    return `${Math.floor(diffSeconds / 86400)} days`;
  };

  // Format date for display
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      
      // Format: MM/DD/YYYY, h:mm:ss AM/PM
      const formattedDate = date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Handle copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // You could add a toast notification here
        console.log('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  // Format transaction hash to show only beginning (like 0x1234...)
  const formatHash = (hash: string, type = 'tx') => {
    if (!hash) return '';
    // For tx hashes, show only beginning like Etherscan
    if (type === 'tx') {
      return `${hash.slice(0, 6)}...`;
    }
    // For addresses, show beginning and end
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Get direction of transaction relative to the viewed address
  const getDirection = (tx: any) => {
    if (!tx.from || !tx.to) return 'out';
    
    const fromAddress = tx.from.hash?.toLowerCase();
    const toAddress = tx.to?.hash?.toLowerCase();
    const viewedAddress = address.toLowerCase();
    
    if (fromAddress === viewedAddress && toAddress === viewedAddress) {
      return 'self';
    } else if (fromAddress === viewedAddress) {
      return 'out';
    } else if (toAddress === viewedAddress) {
      return 'in';
    }
    
    return 'unknown';
  };

  // Format to decimals for transaction values
  const formatToDecimals = (value: string, decimals = 8) => {
    const floatValue = parseFloat(formatEther(value || '0'));
    return floatValue.toFixed(decimals);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    router.push(`/address/${address}?page=${newPage}`);
  };

  // Render table header
  const renderTableHeader = () => (
    <tr className="text-gray-400 border-b border-[#2B3238] text-sm">
      <th className="text-left py-3 px-2">Txn Hash</th>
      <th className="text-left py-3 px-2">Method</th>
      <th className="text-left py-3 px-2">Age</th>
      <th className="text-left py-3 px-2">From</th>
      <th className="text-center py-3 px-2"></th>
      <th className="text-left py-3 px-2">To</th>
      <th className="text-right py-3 px-2">Value</th>
      <th className="text-right py-3 px-2">Txn Fee</th>
    </tr>
  );

  // Render a transaction row
  const renderTransactionRow = (tx: any) => {
    const direction = getDirection(tx);
    return (
      <tr key={tx.hash} className="border-b border-[#2B3238] hover:bg-[#1A1F23] text-sm">
        <td className="py-3 px-2 whitespace-nowrap">
          <div className="flex items-center">
            <Link
              href={`/tx/${tx.hash}`}
              className="text-[#51d2c1] hover:underline"
            >
              {formatHash(tx.hash, 'tx')}
            </Link>
            <button 
              onClick={() => copyToClipboard(tx.hash)}
              className="ml-2 text-gray-400 hover:text-[#51d2c1]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </td>
        
        <td className="py-3 px-2">
          <span className="px-2 py-1 text-xs rounded bg-[#282c32] text-white">
            Transfer
          </span>
        </td>
        
        <td className="py-3 px-2 text-gray-300 whitespace-nowrap">
          {getTimeAgo(tx.timestamp)}
        </td>
        
        <td className="py-3 px-2 whitespace-nowrap">
          <div className="flex items-center">
            <Link
              href={`/address/${tx.from?.hash}`}
              className="text-gray-300 hover:text-[#51d2c1] hover:underline"
            >
              {formatHash(tx.from?.hash, 'address')}
            </Link>
            <button 
              onClick={() => copyToClipboard(tx.from?.hash)}
              className="ml-2 text-gray-400 hover:text-[#51d2c1]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </td>
        
        <td className="py-3 px-0 text-center">
          {direction === 'in' ? (
            <span className="inline-block px-2 py-1 text-xs rounded bg-[#1c3938] text-[#3DD8AF]">IN</span>
          ) : direction === 'out' ? (
            <span className="inline-block px-2 py-1 text-xs rounded bg-[#392d2d] text-[#E37D72]">OUT</span>
          ) : (
            <span className="inline-block px-2 py-1 text-xs rounded bg-[#322c39] text-[#B987DC]">SELF</span>
          )}
        </td>
        
        <td className="py-3 px-2 whitespace-nowrap">
          {tx.to ? (
            <div className="flex items-center">
              <Link
                href={`/address/${tx.to?.hash}`}
                className="text-gray-300 hover:text-[#51d2c1] hover:underline"
              >
                {formatHash(tx.to?.hash, 'address')}
              </Link>
              <button 
                onClick={() => copyToClipboard(tx.to?.hash)}
                className="ml-2 text-gray-400 hover:text-[#51d2c1]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-gray-300">Contract Creation</span>
          )}
        </td>
        
        <td className="py-3 px-2 text-right whitespace-nowrap">
          {formatToDecimals(tx.value || '0')} HYPE
        </td>
        
        <td className="py-3 px-2 text-right text-xs text-gray-400 whitespace-nowrap">
          {formatToDecimals(tx.fee?.value || '0.00004')} HYPE
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-[#0D1114] p-4 md:p-8">
      <div className="max-w-[80rem] mx-auto">
        <BackButton />
        <h1 className="text-2xl mb-6 font-normal">Address Details</h1>
        
        {/* Address displayed directly under the title */}
        <div className="mb-8 flex items-center">
          <span className="text-xl font-bold text-gray-200 break-all flex-1">{address}</span>
          <button 
            onClick={() => copyToClipboard(address)}
            className="text-gray-400 hover:text-[#51d2c1]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* 3-box layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Box 1: Hype balance and token details */}
          <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-5">
            <div className="flex flex-col h-full space-y-5">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Hype Balance:</h3>
                <p className="text-base font-medium">{loading ? '...' : formatHypeBalance(details.balance)} HYPE</p>
              </div>
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Hype Value:</h3>
                <p className="text-base font-medium">{loading || !tokenValue ? '...' : formatUsdValue(tokenValue.toString())}</p>
              </div>
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Tokens:</h3>
                <select 
                  className="w-full bg-[#1A1F23] border border-[#2B3238] rounded p-2 text-gray-300 text-sm"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                >
                  <option value="">Select token</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Box 2: Transaction counts and timestamps */}
          <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-5">
            <div className="flex flex-col h-full space-y-5">
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Total Transactions:</h3>
                <p className="text-base font-medium">{loading ? '...' : formatNumberWithCommas(details.transactionCount)}</p>
              </div>
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Nonce:</h3>
                <p className="text-base font-medium">{loading ? '...' : formatNumberWithCommas(details.nonce)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-gray-400 text-sm mb-2">Last Transaction:</h3>
                  <p className="text-sm">{loading ? '...' : 
                    details.lastTransaction ? formatDate(details.lastTransaction) : 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm mb-2">First Transaction:</h3>
                  <p className="text-sm">{loading ? '...' : 
                    details.firstTransaction ? formatDate(details.firstTransaction) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Box 3: Hyperliquid balances */}
          <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-5">
            <div className="flex flex-col h-full space-y-5">
              <h3 className="text-lg font-medium mb-2">Hyperliquid L1</h3>
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Spot Balance:</h3>
                <p className="text-base font-medium">{formatUsdValue(spotBalance)}</p>
              </div>
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Perps Balance:</h3>
                <p className="text-base font-medium">{formatUsdValue(perpsBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions table (original design) */}
        <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-4 md:p-6">
          <div className="text-sm text-gray-300 mb-4">
            Latest {transactions?.length || 0} from a total of {details.transactionCount ? formatNumberWithCommas(details.transactionCount) : 0} transactions
          </div>

          <div className="overflow-x-auto">
            {txLoading ? (
              <div className="text-center text-gray-400 py-4">Loading transactions...</div>
            ) : !transactions?.length ? (
              <div className="text-center text-gray-400 py-4">No transactions found</div>
            ) : (
              <>
                <table className="w-full table-fixed">
                  <thead>{renderTableHeader()}</thead>
                  <tbody>
                    {transactions.map(tx => renderTransactionRow(tx))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 py-3">
                  <div className="text-sm text-gray-400">
                    Page {page} of {pageCount}
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1}
                      className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                    >
                      &lt;&lt;
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                    >
                      &lt;
                    </button>
                    
                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                      let pageNum = page;
                      if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pageCount - 2) {
                        pageNum = pageCount - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > pageCount) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded border ${
                            page === pageNum
                              ? 'bg-[#51d2c1] text-[#171B20] border-[#51d2c1]'
                              : 'border-[#2B3238] text-gray-300 hover:bg-[#2B3238]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === pageCount || !nextPageParams}
                      className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                    >
                      &gt;
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(pageCount)}
                      disabled={page === pageCount}
                      className="px-3 py-1 rounded border border-[#2B3238] disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:bg-[#2B3238]"
                    >
                      &gt;&gt;
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}