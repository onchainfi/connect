import { useState, useEffect, useCallback } from 'react';
import { useOnchainConfig } from '../context/OnchainConfigContext';
import { useOnchainWallet } from './useOnchainWallet';

export interface PaymentHistoryItem {
  id: string;
  amount: string;
  token: string;
  status: 'pending' | 'success' | 'failed';
  network: string;
  facilitator: string;
  from: string;
  to: string;
  txHash?: string;
  createdAt: string;
  settledAt?: string;
}

export interface UsePaymentHistoryConfig {
  limit?: number;
  address?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

export interface PaymentHistoryData {
  payments: PaymentHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Hook to fetch payment history from Onchain API
 */
export function usePaymentHistory(config?: UsePaymentHistoryConfig): PaymentHistoryData {
  const globalConfig = useOnchainConfig();
  const { address: walletAddress } = useOnchainWallet();

  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error>();
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const limit = config?.limit ?? 10;
  const address = config?.address || walletAddress;
  const autoRefresh = config?.autoRefresh ?? false;
  const refreshInterval = config?.refreshInterval ?? 30000;

  const fetchPayments = useCallback(async (reset = false) => {
    if (!globalConfig.apiKey || !address) {
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `${globalConfig.apiUrl}/v1/payments?address=${address}&limit=${limit}&offset=${currentOffset}`,
        {
          headers: {
            'X-API-Key': globalConfig.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      
      if (reset) {
        setPayments(data.data.payments || []);
        setOffset(limit);
      } else {
        setPayments(prev => [...prev, ...(data.data.payments || [])]);
        setOffset(prev => prev + limit);
      }
      
      setHasMore(data.data.hasMore ?? false);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [globalConfig, address, limit, offset]);

  const refetch = useCallback(async () => {
    await fetchPayments(true);
  }, [fetchPayments]);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchPayments(false);
    }
  }, [isLoading, hasMore, fetchPayments]);

  // Initial fetch
  useEffect(() => {
    if (address && globalConfig.apiKey) {
      fetchPayments(true);
    }
  }, [address, globalConfig.apiKey]); // Only on mount or address/apiKey change

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !address || !globalConfig.apiKey) {
      return;
    }

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, address, globalConfig.apiKey, refetch]);

  return {
    payments,
    isLoading,
    isError,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

