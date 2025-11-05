import type { Transport, CreateConnectorFn } from 'wagmi';
import type { Chain } from 'viem';
import type { PrivyClientConfig } from '@privy-io/react-auth';

export interface TokenConfig {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers?: {
    default: { name: string; url: string };
  };
  tokens: {
    usdc: TokenConfig;
    [key: string]: TokenConfig;
  };
}

export interface AppearanceConfig {
  theme?: 'light' | 'dark';
  accentColor?: string;
  logo?: string;
  landingHeader?: string;
  showWalletLoginFirst?: boolean;
}

export interface OnchainConnectConfig {
  // Required
  privyAppId: string;

  // Optional - Payments
  onchainApiKey?: string;
  onchainApiUrl?: string;

  // Optional - Wagmi Configuration
  chains?: Chain[];
  transports?: Record<number, Transport>;
  connectors?: CreateConnectorFn[];
  wagmiConfig?: any; // Full wagmi Config type

  // Optional - Privy Configuration
  appearance?: AppearanceConfig;
  loginMethods?: Array<'email' | 'twitter' | 'github' | 'google' | 'wallet'>;
  privyConfig?: Partial<PrivyClientConfig>;

  // Optional - Defaults
  defaultChain?: Chain;
  defaultToken?: TokenConfig;
}

export interface OnchainInternalConfig {
  apiKey?: string;
  apiUrl: string;
  defaultChain: Chain;
  defaultToken: TokenConfig;
  chains: Chain[];
}

export interface PaymentCallbacks {
  onSigningStart?: () => void;
  onSigningComplete?: () => void;
  onVerificationStart?: () => void;
  onVerificationComplete?: () => void;
  onSettlementStart?: () => void;
  onSettlementComplete?: () => void;
}

export interface UseOnchainPayConfig {
  apiKey?: string;
  apiUrl?: string;
  network?: string;
  chainId?: number;
  token?: TokenConfig;
  autoVerify?: boolean;
  autoSettle?: boolean;
  retryOnFail?: boolean;
  maxRetries?: number;
  callbacks?: PaymentCallbacks;
}

