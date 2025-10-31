'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { PrivyProvider } from '@privy-io/react-auth';

export interface OnchainConnectProps {
  /** Your Privy App ID from https://dashboard.privy.io */
  privyAppId: string;
  
  /** Your Onchain API key (optional, only needed for x402 payments) */
  onchainApiKey?: string;
  
  /** Custom appearance settings */
  appearance?: {
    theme?: 'light' | 'dark';
    accentColor?: string;
    logo?: string;
  };
  
  /** Login methods to enable (default: all) */
  loginMethods?: Array<'email' | 'twitter' | 'github' | 'google' | 'wallet'>;
  
  children: ReactNode;
}

const defaultWagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

export function OnchainConnect({
  privyAppId,
  appearance = {},
  loginMethods = ['email', 'twitter', 'github', 'wallet'],
  children,
}: OnchainConnectProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: appearance.theme || 'dark',
          accentColor: (appearance.accentColor || '#7C3AED') as `#${string}`,
          logo: appearance.logo,
          landingHeader: 'Connect to Continue',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-only',
        },
        loginMethods,
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={defaultWagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

