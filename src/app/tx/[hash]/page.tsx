// src/app/tx/[hash]/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useNetwork } from '@/contexts/NetworkContext';
import { getTransactionInfo, getTransactionLogs, getTransactionSummary } from '@/utils/api';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { formatEther } from 'ethers';
import { getRelativeTime } from '@/utils/time';

export default function TransactionPage() {
  const { network } = useNetwork();
  const { hash } = useParams();
  const [txData, setTxData] = useState<{
    tx?: any;
    logs?: any;
    summary?: any;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        if (!hash || !network) return;

        setLoading(true);
        setError(null);

        const [txInfo, txLogs, txSummary] = await Promise.all([
          getTransactionInfo(hash as string),
          getTransactionLogs(hash as string),
          getTransactionSummary(hash as string),
        ]);

        if (!isMounted) return;

        setTxData({
          tx: txInfo,
          logs: txLogs,
          summary: txSummary,
        });
      } catch (error) {
        if (isMounted) {
          setError('Failed to load transaction details');
          console.error('Error fetching transaction:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [hash, network]);

  const tx = txData.tx;

  return (
    <div className="min-h-screen bg-[#0D1114] p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <h1 className="text-2xl mb-4">Transaction Details</h1>

        <div className="bg-[#171B20] rounded-lg border border-[#2B3238] p-6">
          {error ? (
            <div className="text-red-400 text-center py-8">
              {error} -{' '}
              <button
                onClick={() => window.location.reload()}
                className="text-[#51d2c1] hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="text-center text-gray-400 py-8 flex items-center justify-center">
              Loading transaction details...
            </div>
          ) : !tx ? (
            <div className="text-center text-gray-400 py-8">Transaction not found</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Transaction Hash:</div>
                <div className="text-[#51d2c1] break-all">{tx.hash}</div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Block:</div>
                <Link
                  href={`/block/${tx.block}`}
                  className="text-[#51d2c1] hover:underline"
                >
                  {tx.block}
                </Link>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Timestamp:</div>
                <div>
                  {new Date(tx.timestamp).toLocaleString()}{' '}
                  <span className="text-gray-400">({getRelativeTime(BigInt(Math.floor(new Date(tx.timestamp).getTime() / 1000)))})</span>
                </div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">From:</div>
                <Link
                  href={`/address/${tx.from.hash}`}
                  className="break-all hover:text-[#51d2c1] hover:underline"
                >
                  {tx.from.hash}
                </Link>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">To:</div>
                {tx.to ? (
                  <Link
                    href={`/address/${tx.to.hash}`}
                    className="break-all hover:text-[#51d2c1] hover:underline"
                  >
                    {tx.to.hash}
                  </Link>
                ) : (
                  <div className="break-all">Contract Creation</div>
                )}
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Value:</div>
                <div className="break-all">{formatEther(tx.value)} HYPE</div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Gas Price:</div>
                <div>{(Number(tx.gas_price) / 1e9).toFixed(2)} Gwei</div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Gas Used:</div>
                <div>
                  {tx.gas_used} ({((Number(tx.gas_used) / Number(tx.gas)) * 100).toFixed(2)}%)
                </div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Gas Limit:</div>
                <div>{tx.gas}</div>
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="text-gray-400">Transaction Fee:</div>
                <div className="break-all">
                  {formatEther(BigInt(tx.gas_used) * BigInt(tx.gas_price))} HYPE
                </div>
              </div>
              {tx.decoded_input && (
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="text-gray-400">Function:</div>
                  <div className="text-[#51d2c1]">{tx.decoded_input}</div>
                </div>
              )}
              {txData.summary && (
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="text-gray-400">Summary:</div>
                  <div>{txData.summary.text}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}