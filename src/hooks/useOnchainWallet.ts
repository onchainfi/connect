import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';

export interface OnchainWallet {
  /** User's wallet address (from Privy embedded wallet or external wallet) */
  address: string | undefined;
  
  /** Whether user is authenticated/connected */
  isConnected: boolean;
  
  /** Whether user is authenticated via Privy (email/social) */
  isPrivyUser: boolean;
  
  /** Whether user is connected via external wallet */
  isExternalWallet: boolean;
  
  /** Privy user object (if authenticated via Privy) */
  user: any;
  
  /** Open Privy login modal */
  login: () => void;
  
  /** Disconnect/logout */
  logout: () => void;
}

/**
 * Unified wallet hook that works with both Privy embedded wallets and external wallets
 */
export function useOnchainWallet(): OnchainWallet {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { authenticated, user, login, logout } = usePrivy();

  const address = user?.wallet?.address || wagmiAddress;
  const isConnected = authenticated || wagmiConnected;

  return {
    address,
    isConnected,
    isPrivyUser: authenticated,
    isExternalWallet: wagmiConnected && !authenticated,
    user,
    login,
    logout,
  };
}

