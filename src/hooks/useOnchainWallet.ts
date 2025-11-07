import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';

export interface OnchainWallet {
  /** User's wallet address (from Privy embedded wallet or external wallet) */
  address: string | undefined;
  
  /** Whether user is authenticated/connected */
  isConnected: boolean;
  
  /** Whether user is authenticated via Privy (email/social) */
  isPrivyUser: boolean;
  
  /** Whether user is connected via external wallet */
  isExternalWallet: boolean;
  
  /** Chain type: 'evm' or 'solana' */
  chainType: 'evm' | 'solana';
  
  /** Network name (e.g., 'base', 'solana') */
  network: string;
  
  /** Privy user object (if authenticated via Privy) */
  user: any;
  
  /** Open Privy login modal */
  login: () => void;
  
  /** Disconnect/logout */
  logout: () => void;
}

/**
 * Unified wallet hook that works with both Privy embedded wallets and external wallets
 * Supports both EVM (wagmi) and Solana wallet adapters
 */
export function useOnchainWallet(): OnchainWallet {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { authenticated, user, login, logout } = usePrivy();
  const solanaWallet = useSolanaWallet();

  // Determine if user has a Solana wallet active
  const hasSolanaWallet = solanaWallet.connected && !!solanaWallet.publicKey;
  const hasPrivySolanaWallet = authenticated && user?.wallet?.chainType === 'solana';
  
  // Priority: External Solana > Privy Solana > EVM
  let address: string | undefined;
  let chainType: 'evm' | 'solana';
  let network: string;
  let isExternalWallet: boolean;

  if (hasSolanaWallet) {
    // External Solana wallet (Phantom, Solflare, etc.)
    address = solanaWallet.publicKey?.toBase58();
    chainType = 'solana';
    network = 'solana';
    isExternalWallet = true;
  } else if (hasPrivySolanaWallet) {
    // Privy embedded Solana wallet
    address = user?.wallet?.address;
    chainType = 'solana';
    network = 'solana';
    isExternalWallet = false;
  } else {
    // EVM wallet (Privy or external)
    address = user?.wallet?.address || wagmiAddress;
    chainType = 'evm';
    network = 'base'; // Default, can be enhanced to detect actual chain
    isExternalWallet = wagmiConnected && !authenticated;
  }

  const isConnected = hasSolanaWallet || authenticated || wagmiConnected;

  return {
    address,
    isConnected,
    isPrivyUser: authenticated,
    isExternalWallet,
    chainType,
    network,
    user,
    login,
    logout: hasSolanaWallet ? () => solanaWallet.disconnect() : logout,
  };
}

