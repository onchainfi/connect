import { base } from 'wagmi/chains';
import type { TokenConfig } from '../types/config';
import { SUPPORTED_CHAINS } from './chains';

/**
 * Default API URL for Onchain aggregator
 */
export const DEFAULT_API_URL = 'https://api.onchain.fi';

/**
 * Default chain (Base mainnet)
 */
export const DEFAULT_CHAIN = base;

/**
 * Default token (USDC on Base)
 */
export const DEFAULT_TOKEN: TokenConfig = SUPPORTED_CHAINS.base.tokens.usdc;

/**
 * Default network name
 */
export const DEFAULT_NETWORK = 'base';

/**
 * Default priority for payments
 */
export const DEFAULT_PRIORITY = 'balanced' as const;

/**
 * Default Privy appearance
 */
export const DEFAULT_APPEARANCE = {
  theme: 'dark' as const,
  accentColor: '#7C3AED',
  landingHeader: 'Connect to Continue',
  showWalletLoginFirst: false,
};

/**
 * Default login methods
 */
export const DEFAULT_LOGIN_METHODS = ['email', 'twitter', 'github', 'wallet'] as const;

/**
 * Default payment configuration
 */
export const DEFAULT_PAYMENT_CONFIG = {
  autoVerify: true,
  autoSettle: true,
  retryOnFail: false,
  maxRetries: 0,
};

