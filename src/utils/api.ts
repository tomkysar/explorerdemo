const API_BASE_URL = 'https://hyperscan.gas.zip/';

export interface ApiResponse<T> {
  items: T[];
  next_page_params?: {
    items_count: number;
    block_number: number;
  };
}

// Generic fetch function with error handling
async function fetchFromApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${endpoint}${queryParams ? `?${queryParams}` : ''}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

// Main page data
export const getMainPageBlocks = () => {
  return fetchFromApi<ApiResponse<any>>('/api/v2/main-page/blocks');
};

export const getMainPageTransactions = () => {
  return fetchFromApi<ApiResponse<any>>('/api/v2/main-page/transactions');
};

export const getIndexingStatus = () => {
  return fetchFromApi<{
    block_number: string;
    blocks_indexed: string;
    indexed_internal_transactions: boolean;
    indexed_ratio: string;
  }>('/api/v2/main-page/indexing-status');
};

export const getStats = () => {
  return fetchFromApi<{
    average_block_time: string;
    coin_price: string | null;
    gas_limit: string;
    gas_price: string;
    gas_used: string;
    market_cap: string | null;
    total_addresses: string;
    total_blocks: string;
    total_transactions: string;
    transactions_per_second: number;
  }>('/api/v2/stats');
};

// Transaction details
export const getTransactionInfo = (hash: string) => {
  return fetchFromApi<{
    hash: string;
    block: string;
    status: string;
    timestamp: string;
    from: { hash: string };
    to: { hash: string } | null;
    value: string;
    gas: string;
    gas_price: string;
    gas_used: string;
    nonce: string;
    position: string;
    input: string;
    decoded_input: string | null;
    confirmations: string;
    raw_input: string;
  }>(`/api/v2/transactions/${hash}`);
};

export const getTransactionTokenTransfers = (hash: string) => {
  return fetchFromApi<ApiResponse<{
    token: {
      address: string;
      symbol: string;
      name: string;
      decimals: string;
      type: string;
    };
    from: { hash: string };
    to: { hash: string };
    value: string;
  }>>(`/api/v2/transactions/${hash}/token-transfers`);
};

export const getTransactionLogs = (hash: string) => {
  return fetchFromApi<ApiResponse<{
    address: { hash: string };
    data: string;
    index: string;
    topics: string[];
    decoded?: {
      method: string;
      types: string[];
      names: string[];
      values: any[];
    };
  }>>(`/api/v2/transactions/${hash}/logs`);
};

export const getTransactionSummary = (hash: string) => {
  return fetchFromApi<{
    text: string;
  }>(`/api/v2/transactions/${hash}/summary`);
};

// Block details
export const getBlockInfo = (numberOrHash: string) => {
  return fetchFromApi<{
    height: string;
    timestamp: string;
    tx_count: string;
    gas_used: string;
    gas_limit: string;
    hash: string;
    parent_hash: string;
    miner: { hash: string };
    size: string;
    nonce: string;
    base_fee_per_gas: string;
  }>(`/api/v2/blocks/${numberOrHash}`);
};

export const getBlockTransactions = (
  numberOrHash: string,
  params: { limit?: string; page?: string } = {}
) => {
  // Always ensure we're requesting only 10 items
  const finalParams = {
    ...params,
    limit: '10'
  };
  
  return fetchFromApi<ApiResponse<{
    hash: string;
    block: string;
    value: string;
    fee: { value: string };
    gas_price: string;
    gas_used: string;
    timestamp: string;
    from: { hash: string };
    to: { hash: string } | null;
    method: string;
  }>>(`/api/v2/blocks/${numberOrHash}/transactions`, finalParams);
};

// Address details
export const getAddressInfo = (address: string) => {
  return fetchFromApi<{
    hash: string;
    coin_balance: string;
    nonce: string;
    implementation_address: string | null;
    proxy_implementation_address: string | null;
    is_contract: boolean;
    name_hash: string | null;
    exchange_rate: string | null;
  }>(`/api/v2/addresses/${address}`);
};

export const getAddressTransactions = (
  address: string,
  params: { 
    limit?: string; 
    items_count?: string;
    block_number?: string;
    filter?: string; // "to" | "from" | "all"
  } = {}
) => {
  // Always ensure we're requesting only 10 items
  const finalParams = {
    ...params,
    limit: '10'
  };
  
  return fetchFromApi<ApiResponse<{
    hash: string;
    block: string;
    value: string;
    fee: { value: string };
    gas_price: string;
    gas_used: string;
    gas_limit: string;
    timestamp: string;
    from: { hash: string };
    to: { hash: string } | null;
    method: string | null;
    status: string;
    block_number: string;
  }>>(`/api/v2/addresses/${address}/transactions`, finalParams);
};

export const getAddressTokenBalances = (address: string) => {
  return fetchFromApi<ApiResponse<{
    token: {
      address: string;
      name: string;
      symbol: string;
      type: string;
      decimals: string;
      icons: any;
    };
    value: string;
  }>>(`/api/v2/addresses/${address}/token-balances`);
};

export const getAddressCounters = (address: string) => {
  return fetchFromApi<{
    gas_usage_count: string;
    token_transfers_count: string;
    transactions_count: string;
    validation_count: string;
  }>(`/api/v2/addresses/${address}/counters`);
};

// Token related endpoints
export const getTokenInfo = (tokenAddress: string) => {
  return fetchFromApi<{
    address: string;
    symbol: string;
    name: string;
    decimals: string;
    type: string;
    holders: string;
    total_supply: string;
    exchange_rate: string | null;
  }>(`/api/v2/tokens/${tokenAddress}`);
};

export const getTokenHolders = (
  tokenAddress: string,
  params: { limit?: string; page?: string } = {}
) => {
  // Always ensure we're requesting only 10 items
  const finalParams = {
    ...params,
    limit: '10'
  };
  
  return fetchFromApi<ApiResponse<{
    address: { hash: string };
    value: string;
  }>>(`/api/v2/tokens/${tokenAddress}/holders`, finalParams);
};

// Smart contract related endpoints
export const getSmartContractInfo = (address: string) => {
  return fetchFromApi<{
    address: { hash: string };
    abi: any;
    name: string;
    source_code: string;
    compiler_version: string;
    evm_version: string;
    optimization_enabled: boolean;
    optimization_runs: number;
    contract_source_code: string;
    license_type: string;
  }>(`/api/v2/smart-contracts/${address}`);
};

// Search functionality
export const searchByQuery = (query: string) => {
  return fetchFromApi<{
    redirect: boolean;
    type: string;
    parameter: string;
  }>(`/api/v2/search?q=${encodeURIComponent(query)}`);
};