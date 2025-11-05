import { useState, useEffect, useCallback } from 'react';
import { useOnchainConfig } from '../context/OnchainConfigContext';

export interface FacilitatorHealth {
  name: string;
  isHealthy: boolean;
  latencyMs: number | null;
  lastChecked?: string;
}

export interface NetworkStatusData {
  facilitators: FacilitatorHealth[];
  isHealthy: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => Promise<void>;
}

export interface UseNetworkStatusConfig {
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  network?: string;
}

/**
 * Hook to fetch facilitator health and network status from Onchain API
 */
export function useNetworkStatus(config?: UseNetworkStatusConfig): NetworkStatusData {
  const globalConfig = useOnchainConfig();

  const [facilitators, setFacilitators] = useState<FacilitatorHealth[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error>();

  const autoRefresh = config?.autoRefresh ?? true;
  const refreshInterval = config?.refreshInterval ?? 30000;
  const network = config?.network || 'base';

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);

    try {
      const response = await fetch(
        `${globalConfig.apiUrl}/v1/facilitators?network=${network}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch network status');
      }

      const data = await response.json();
      setFacilitators(data.data.facilitators || []);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setFacilitators([]);
    } finally {
      setIsLoading(false);
    }
  }, [globalConfig.apiUrl, network]);

  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [network]); // Re-fetch when network changes

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      fetchStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStatus]);

  const isHealthy = facilitators.length > 0 && facilitators.some(f => f.isHealthy);

  return {
    facilitators,
    isHealthy,
    isLoading,
    isError,
    error,
    refetch,
  };
}

