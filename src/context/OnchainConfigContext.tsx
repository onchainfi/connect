'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Chain } from 'viem';
import type { TokenConfig, OnchainInternalConfig } from '../types/config';
import { DEFAULT_API_URL, DEFAULT_CHAIN, DEFAULT_TOKEN } from '../config/defaults';

const OnchainConfigContext = createContext<OnchainInternalConfig | null>(null);

export interface OnchainConfigProviderProps {
  apiKey?: string;
  apiUrl?: string;
  defaultChain?: Chain;
  defaultToken?: TokenConfig;
  chains?: Chain[];
  children: ReactNode;
}

export function OnchainConfigProvider({
  apiKey,
  apiUrl = DEFAULT_API_URL,
  defaultChain = DEFAULT_CHAIN,
  defaultToken = DEFAULT_TOKEN,
  chains = [DEFAULT_CHAIN],
  children,
}: OnchainConfigProviderProps) {
  const config: OnchainInternalConfig = {
    apiKey,
    apiUrl,
    defaultChain,
    defaultToken,
    chains,
  };

  return (
    <OnchainConfigContext.Provider value={config}>
      {children}
    </OnchainConfigContext.Provider>
  );
}

/**
 * Hook to access Onchain configuration
 * @throws Error if used outside OnchainConnect provider
 */
export function useOnchainConfig(): OnchainInternalConfig {
  const config = useContext(OnchainConfigContext);
  
  if (!config) {
    throw new Error(
      'useOnchainConfig must be used within OnchainConnect provider. ' +
      'Wrap your app with <OnchainConnect> to use Onchain hooks and components.'
    );
  }
  
  return config;
}

/**
 * Hook to safely access Onchain configuration (returns null if not in provider)
 */
export function useOnchainConfigSafe(): OnchainInternalConfig | null {
  return useContext(OnchainConfigContext);
}

