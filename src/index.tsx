// ===== Components =====
export { OnchainConnect } from './components/OnchainConnect';
export type { OnchainConnectProps } from './components/OnchainConnect';

export { WalletButton } from './components/WalletButton';
export type { WalletButtonProps } from './components/WalletButton';

export { PaymentForm } from './components/PaymentForm';
export type { PaymentFormProps } from './components/PaymentForm';

export { PaymentButton } from './components/PaymentButton';
export type { PaymentButtonProps } from './components/PaymentButton';

export { BalanceDisplay } from './components/BalanceDisplay';
export type { BalanceDisplayProps } from './components/BalanceDisplay';

export { TransactionHistory } from './components/TransactionHistory';
export type { TransactionHistoryProps } from './components/TransactionHistory';

// ===== Hooks =====
export { useOnchainWallet } from './hooks/useOnchainWallet';
export type { OnchainWallet } from './hooks/useOnchainWallet';

export { useOnchainPay } from './hooks/useOnchainPay';
export type { PaymentParams, PaymentResult } from './hooks/useOnchainPay';

export { useChainAlignment } from './hooks/useChainAlignment';
export type { ChainAlignmentState } from './hooks/useChainAlignment';

// Advanced: Chain-specific payment hooks (optional)
export { useEvmPay } from './hooks/useEvmPay';
export { useSolanaPay } from './hooks/useSolanaPay';

export { useBalance } from './hooks/useBalance';
export type { UseBalanceConfig, BalanceData } from './hooks/useBalance';

export { usePaymentHistory } from './hooks/usePaymentHistory';
export type { 
  UsePaymentHistoryConfig, 
  PaymentHistoryData, 
  PaymentHistoryItem 
} from './hooks/usePaymentHistory';

export { useNetworkStatus } from './hooks/useNetworkStatus';
export type { 
  UseNetworkStatusConfig, 
  NetworkStatusData, 
  FacilitatorHealth 
} from './hooks/useNetworkStatus';

// ===== Context =====
export { useOnchainConfig, useOnchainConfigSafe } from './context/OnchainConfigContext';

// ===== Types =====
export type {
  TokenConfig,
  ChainConfig,
  AppearanceConfig,
  OnchainConnectConfig,
  OnchainInternalConfig,
  PaymentCallbacks,
  UseOnchainPayConfig,
} from './types/config';

// ===== Config & Utilities =====
export { SUPPORTED_CHAINS, getTokenAddress, getTokenConfig, getChainConfig, getChainConfigByName, isSolanaNetwork, getExplorerUrl } from './config/chains';
export { COMMON_TOKENS, formatTokenAmount, parseTokenAmount } from './config/tokens';
export { CHAIN_ID_TO_NAME, getChainName, isKnownChain } from './config/chainNames';
export { 
  DEFAULT_API_URL, 
  DEFAULT_CHAIN, 
  DEFAULT_TOKEN, 
  DEFAULT_NETWORK, 
  DEFAULT_PRIORITY, 
  DEFAULT_APPEARANCE, 
  DEFAULT_LOGIN_METHODS 
} from './config/defaults';

// ===== Solana Wallet Adapter (Re-export for consuming apps) =====
export { useWallet as useSolanaWallet, useConnection as useSolanaConnection } from '@solana/wallet-adapter-react';

