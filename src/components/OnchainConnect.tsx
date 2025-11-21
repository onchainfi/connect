'use client';

import { ReactNode, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import type { OnchainConnectConfig } from '../types/config';
import { OnchainConfigProvider } from '../context/OnchainConfigContext';
import {
  DEFAULT_API_URL,
  DEFAULT_CHAIN,
  DEFAULT_TOKEN,
  DEFAULT_APPEARANCE,
  DEFAULT_LOGIN_METHODS,
} from '../config/defaults';

export interface OnchainConnectProps extends OnchainConnectConfig {
  children: ReactNode;
}

export function OnchainConnect({
  privyAppId,
  onchainApiKey,
  onchainApiUrl = DEFAULT_API_URL,
  chains,
  transports,
  connectors,
  wagmiConfig,
  solanaRpcUrl,
  appearance = {},
  loginMethods = DEFAULT_LOGIN_METHODS as any,
  privyConfig,
  defaultChain = DEFAULT_CHAIN,
  defaultToken = DEFAULT_TOKEN,
  children,
}: OnchainConnectProps) {
  const [queryClient] = useState(() => new QueryClient());

  // Use custom wagmi config or create default
  const finalWagmiConfig = useMemo(() => {
    if (wagmiConfig) {
      return wagmiConfig;
    }

    const configChains = chains || [defaultChain];
    const configTransports = transports || {
      [defaultChain.id]: http(),
    };

    return createConfig({
      chains: configChains as any,
      transports: configTransports,
      connectors,
    });
  }, [wagmiConfig, chains, transports, connectors, defaultChain]);

  // Merge appearance with defaults
  const finalAppearance = {
    theme: appearance.theme || DEFAULT_APPEARANCE.theme,
    accentColor: (appearance.accentColor || DEFAULT_APPEARANCE.accentColor) as `#${string}`,
    logo: appearance.logo,
    landingHeader: appearance.landingHeader || DEFAULT_APPEARANCE.landingHeader,
    showWalletLoginFirst: appearance.showWalletLoginFirst ?? DEFAULT_APPEARANCE.showWalletLoginFirst,
    walletChainType: 'ethereum-and-solana' as const, // Support both chains
  };

  // Setup Solana wallet adapters
  const solanaEndpoint = useMemo(
    () => {
      // Priority: prop > public fallback
      // Note: solanaRpcUrl prop should be passed from consuming app's env vars
      // e.g., <OnchainConnect solanaRpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC_URL} />
      if (solanaRpcUrl) {
        return solanaRpcUrl;
      }
      
      // Fallback to public (rate-limited, but safe)
      return 'https://api.mainnet-beta.solana.com';
    },
    [solanaRpcUrl]
  );

  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Build Privy config (use custom config if provided, otherwise build default)
  const finalPrivyConfig = useMemo(() => {
    if (privyConfig) {
      return privyConfig;
    }
    
    return {
      appearance: finalAppearance,
      loginMethods,
      embeddedWallets: {
        ethereum: {
          createOnLogin: 'users-without-wallets' as const,
        },
        solana: {
          createOnLogin: 'users-without-wallets' as const, // NEW: Auto-create Solana wallets
        },
      },
      defaultChain,
      supportedChains: chains || [defaultChain],
    };
  }, [privyConfig, finalAppearance, loginMethods, defaultChain, chains]);

  return (
    <ConnectionProvider endpoint={solanaEndpoint}>
      <WalletProvider wallets={solanaWallets} autoConnect={false}>
        <PrivyProvider appId={privyAppId} config={finalPrivyConfig}>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={finalWagmiConfig}>
              <OnchainConfigProvider
                apiKey={onchainApiKey}
                apiUrl={onchainApiUrl}
                defaultChain={defaultChain}
                defaultToken={defaultToken}
                chains={chains || [defaultChain]}
              >
                {children}
              </OnchainConfigProvider>
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

