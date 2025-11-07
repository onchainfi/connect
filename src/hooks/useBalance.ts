import { useBalance as useWagmiBalance } from 'wagmi';
import { useOnchainWallet } from './useOnchainWallet';
import { useOnchainConfig } from '../context/OnchainConfigContext';
import type { TokenConfig } from '../types/config';
import { formatTokenAmount } from '../config/tokens';

export interface UseBalanceConfig {
  token?: TokenConfig;
  address?: `0x${string}`;
  watch?: boolean;
}

export interface BalanceData {
  value: bigint;
  formatted: string;
  symbol: string;
  decimals: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch token balance for connected wallet (or specified address)
 */
export function useBalance(config?: UseBalanceConfig): BalanceData {
  const { address: walletAddress } = useOnchainWallet();
  const globalConfig = useOnchainConfig();

  const token = config?.token || globalConfig.defaultToken;
  const address = config?.address || walletAddress;

  const { data, isLoading, isError, refetch } = useWagmiBalance({
    address: address as `0x${string}` | undefined,
    token: token.address as `0x${string}`,
  });

  const value = data?.value ?? 0n;
  const formatted = data ? formatTokenAmount(data.value, token.decimals) : '0';

  return {
    value,
    formatted,
    symbol: token.symbol,
    decimals: token.decimals,
    isLoading,
    isError,
    refetch,
  };
}

