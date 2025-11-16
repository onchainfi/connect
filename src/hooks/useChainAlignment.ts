import { useMemo, useEffect, useState, useCallback } from 'react';
import { useSwitchChain } from 'wagmi';
import { useOnchainWallet } from './useOnchainWallet';

export interface ChainAlignmentState {
  /** Whether wallet chain matches expected source network */
  isAligned: boolean;
  
  /** Current chain ID from wallet (undefined for Solana) */
  walletChainId: number | undefined;
  
  /** Expected chain ID based on source network (undefined for Solana) */
  expectedChainId: number | undefined;
  
  /** Whether user needs to switch chains */
  needsSwitch: boolean;
  
  /** Wallet chain type */
  walletChainType: 'evm' | 'solana';
  
  /** Human-readable wallet network name */
  walletNetworkName: string;
  
  /** Whether currently switching chains */
  isSwitching: boolean;
  
  /** Error from switch attempt */
  switchError: Error | undefined;
  
  /** Trigger chain switch prompt */
  promptSwitch: () => Promise<void>;
  
  /** Clear switch error */
  clearError: () => void;
}

/**
 * Network to Chain ID mapping
 * Only Base and Solana supported as source networks
 */
const NETWORK_TO_CHAIN_ID: Record<string, number | undefined> = {
  'base': 8453,
  'solana': undefined, // Solana doesn't use EVM chain IDs
};

/**
 * Chain ID to human-readable name mapping
 */
const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'Ethereum Mainnet',
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum One',
  84532: 'Base Sepolia',
};

/**
 * Hook for monitoring and managing chain alignment between wallet and app
 * 
 * Validates that the user's wallet is on the correct chain for the selected
 * source network. Provides automatic detection and switching capabilities.
 * 
 * @param sourceNetwork - The source network selected in the UI ('base' or 'solana')
 * @returns ChainAlignmentState with validation status and switch function
 */
export function useChainAlignment(sourceNetwork: 'base' | 'solana'): ChainAlignmentState {
  const { chainId, isConnected, chainType } = useOnchainWallet();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<Error | undefined>();

  // Determine expected chain ID based on source network
  const expectedChainId = NETWORK_TO_CHAIN_ID[sourceNetwork];
  
  // Check if wallet chain type matches source network type
  const chainTypeMatches = useMemo(() => {
    if (sourceNetwork === 'solana') {
      return chainType === 'solana';
    }
    return chainType === 'evm';
  }, [sourceNetwork, chainType]);

  // Check if wallet chain ID matches expected chain ID (for EVM only)
  const chainIdMatches = useMemo(() => {
    if (sourceNetwork === 'solana') {
      return true; // Solana doesn't have chainId concept
    }
    return chainId === expectedChainId;
  }, [chainId, expectedChainId, sourceNetwork]);

  // Overall alignment status
  const isAligned = useMemo(() => {
    if (!isConnected) return false;
    return chainTypeMatches && chainIdMatches;
  }, [isConnected, chainTypeMatches, chainIdMatches]);

  // Whether user needs to switch
  const needsSwitch = isConnected && !isAligned;

  // Get human-readable network name
  const walletNetworkName = useMemo(() => {
    if (chainType === 'solana') return 'Solana';
    if (chainId) return CHAIN_ID_TO_NAME[chainId] || `Chain ${chainId}`;
    return 'Unknown';
  }, [chainType, chainId]);

  // Log alignment state on changes
  useEffect(() => {
    if (isConnected) {
      console.log('[useChainAlignment] Alignment check:', {
        sourceNetwork,
        walletChainType: chainType,
        walletChainId: chainId,
        walletNetworkName,
        expectedChainId,
        isAligned,
        needsSwitch,
        chainTypeMatches,
        chainIdMatches,
      });
    }
  }, [
    isConnected,
    sourceNetwork,
    chainType,
    chainId,
    walletNetworkName,
    expectedChainId,
    isAligned,
    needsSwitch,
    chainTypeMatches,
    chainIdMatches,
  ]);

  // Trigger automatic validation when source network changes
  useEffect(() => {
    if (needsSwitch) {
      console.log('[useChainAlignment] ⚠️ Misalignment detected:', {
        reason: !chainTypeMatches 
          ? `Wrong wallet type: ${chainType} (expected ${sourceNetwork === 'solana' ? 'solana' : 'evm'})`
          : `Wrong chain: ${chainId} (expected ${expectedChainId})`,
        action: 'User needs to switch',
      });
    }
  }, [needsSwitch, chainTypeMatches, chainType, sourceNetwork, chainId, expectedChainId]);

  // Function to prompt user to switch chains
  const promptSwitch = useCallback(async () => {
    if (!expectedChainId) {
      const error = new Error('Cannot switch to Solana from EVM wallet. Please use a Solana wallet.');
      setSwitchError(error);
      console.error('[useChainAlignment] Switch error:', error.message);
      return;
    }

    if (!isConnected) {
      const error = new Error('Wallet not connected');
      setSwitchError(error);
      console.error('[useChainAlignment] Switch error:', error.message);
      return;
    }

    setIsSwitching(true);
    setSwitchError(undefined);

    try {
      console.log('[useChainAlignment] 🔄 Requesting chain switch to:', {
        chainId: expectedChainId,
        network: sourceNetwork,
      });

      await switchChainAsync({ chainId: expectedChainId });

      console.log('[useChainAlignment] ✅ Chain switch successful:', {
        newChainId: expectedChainId,
        network: sourceNetwork,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Chain switch failed');
      setSwitchError(err);
      
      // Check if user rejected
      if (err.message.includes('User rejected') || err.message.includes('denied')) {
        console.log('[useChainAlignment] ❌ User rejected chain switch');
      } else {
        console.error('[useChainAlignment] ❌ Chain switch error:', err);
      }
    } finally {
      setIsSwitching(false);
    }
  }, [expectedChainId, sourceNetwork, isConnected, switchChainAsync]);

  // Clear error function
  const clearError = useCallback(() => {
    setSwitchError(undefined);
  }, []);

  return {
    isAligned,
    walletChainId: chainId,
    expectedChainId,
    needsSwitch,
    walletChainType: chainType,
    walletNetworkName,
    isSwitching: isSwitching || isSwitchingChain,
    switchError,
    promptSwitch,
    clearError,
  };
}

