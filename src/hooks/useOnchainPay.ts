import { useOnchainWallet } from './useOnchainWallet';
import { useEvmPay } from './useEvmPay';
import { useSolanaPay } from './useSolanaPay';
import type { UseOnchainPayConfig, TokenConfig } from '../types/config';

export interface PaymentParams {
  /** Recipient address */
  to: string;
  
  /** Amount in token units (e.g., "0.10" for 10 cents) */
  amount: string;
  
  /** Source network - where payment originates (optional, auto-detected from wallet) */
  sourceNetwork?: string;
  
  /** Destination network - where recipient receives payment (required for cross-chain) */
  destinationNetwork?: string;
  
  /** Network (deprecated, use sourceNetwork/destinationNetwork instead) */
  network?: string;
  
  /** Chain ID (optional, uses config default) */
  chainId?: number;
  
  /** Token config (optional, uses config default) */
  token?: TokenConfig;
  
  /** Routing priority (default: 'balanced') */
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';
  
  /** Success callback */
  onSuccess?: (txHash: string) => void;
  
  /** Error callback */
  onError?: (error: Error) => void;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
  verified?: boolean;
  settled?: boolean;
}

/**
 * Unified payment hook that routes to EVM or Solana implementation
 * based on the active wallet type.
 * 
 * This is a smart router that delegates to:
 * - useEvmPay() for EVM chains (Base, Optimism, Arbitrum, etc.)
 * - useSolanaPay() for Solana chains
 * 
 * Both hooks are called unconditionally (React rules), but only the
 * appropriate one is returned based on chainType.
 */
export function useOnchainPay(config?: UseOnchainPayConfig) {
  const { chainType } = useOnchainWallet();
  
  // Call both hooks (React requires unconditional hook calls)
  // Each hook only runs its own chain-specific code internally
  const evmPay = useEvmPay(config);
  const solanaPay = useSolanaPay(config);
  
  // Route based on active chain type
  // Priority: Solana wallet > EVM wallet (default)
  return chainType === 'solana' ? solanaPay : evmPay;
}

