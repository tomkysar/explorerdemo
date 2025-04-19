// src/components/DashboardStats.tsx
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/contexts/NetworkContext';
import { getStats, getIndexingStatus } from '@/utils/api';

export default function DashboardStats() {
  const { network } = useNetwork();
  
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats', network],
    queryFn: async () => {
      return getStats();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  const { data: indexingStatus, isLoading: isIndexingLoading } = useQuery({
    queryKey: ['indexing-status', network],
    queryFn: async () => {
      return getIndexingStatus();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const isLoading = isStatsLoading || isIndexingLoading;

  const LoadingIndicator = () => (
    <div className="animate-pulse">
      <div className="h-4 w-20 bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <div className="bg-[#171B20] p-4 rounded-lg border border-[#2B3238]">
        <div className="text-gray-400 text-sm">Average Block Time</div>
        <div className="text-xl font-medium text-[#E1E4E7]">
          {isLoading ? <LoadingIndicator /> : `${stats?.average_block_time || 0} sec`}
        </div>
      </div>
      <div className="bg-[#171B20] p-4 rounded-lg border border-[#2B3238]">
        <div className="text-gray-400 text-sm">Gas Limit</div>
        <div className="text-xl font-medium text-[#E1E4E7]">
          {isLoading ? <LoadingIndicator /> : (parseInt(stats?.gas_limit || '0') / 1e6).toFixed(1) + 'M'}
        </div>
      </div>
      <div className="bg-[#171B20] p-4 rounded-lg border border-[#2B3238]">
        <div className="text-gray-400 text-sm">Current TPS</div>
        <div className="text-xl font-medium text-[#E1E4E7]">
          {isLoading ? <LoadingIndicator /> : (stats?.transactions_per_second || 0).toFixed(2)}
        </div>
      </div>
      <div className="bg-[#171B20] p-4 rounded-lg border border-[#2B3238]">
        <div className="text-gray-400 text-sm">Gas Price</div>
        <div className="text-xl font-medium text-[#E1E4E7]">
          {isLoading ? <LoadingIndicator /> : `${(parseInt(stats?.gas_price || '0') / 1e9).toFixed(3)} Gwei`}
        </div>
      </div>
      <div className="bg-[#171B20] p-4 rounded-lg border border-[#2B3238]">
        <div className="text-gray-400 text-sm">Latest Block</div>
        <div className="text-xl font-medium text-[#E1E4E7]">
          {isLoading ? <LoadingIndicator /> : indexingStatus?.block_number || '0'}
        </div>
      </div>
    </div>
  );
}