import type { ChainConfig } from '../types/config';

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  base: {
    id: 8453,
    name: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://mainnet.base.org'] },
      public: { http: ['https://mainnet.base.org'] },
    },
    blockExplorers: {
      default: { name: 'BaseScan', url: 'https://basescan.org' },
    },
    tokens: {
      usdc: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
    samechainIntermediateWallet: process.env.NEXT_PUBLIC_SAMECHAIN_BASE_WALLET || '0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1',
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://mainnet.optimism.io'] },
      public: { http: ['https://mainnet.optimism.io'] },
    },
    blockExplorers: {
      default: { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' },
    },
    tokens: {
      usdc: {
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://arb1.arbitrum.io/rpc'] },
      public: { http: ['https://arb1.arbitrum.io/rpc'] },
    },
    blockExplorers: {
      default: { name: 'Arbiscan', url: 'https://arbiscan.io' },
    },
    tokens: {
      usdc: {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://sepolia.base.org'] },
      public: { http: ['https://sepolia.base.org'] },
    },
    blockExplorers: {
      default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
    },
    tokens: {
      usdc: {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  },
  // Solana chains
  solana: {
    id: 1399811149, // Custom ID for Solana mainnet
    name: 'Solana',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: {
      default: { http: ['https://api.mainnet-beta.solana.com'] },
      public: { http: ['https://api.mainnet-beta.solana.com'] },
    },
    blockExplorers: {
      default: { name: 'Solscan', url: 'https://solscan.io' },
    },
    tokens: {
      usdc: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as any,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
    samechainIntermediateWallet: process.env.NEXT_PUBLIC_SAMECHAIN_SOLANA_WALLET || 'DoVABZK8r9793SuR3powWCTdr2wVqwhueV9DuZu97n2L',
  },
  solanaDevnet: {
    id: 1399811150, // Custom ID for Solana devnet
    name: 'Solana Devnet',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: {
      default: { http: ['https://api.devnet.solana.com'] },
      public: { http: ['https://api.devnet.solana.com'] },
    },
    blockExplorers: {
      default: { name: 'Solscan Devnet', url: 'https://solscan.io' },
    },
    tokens: {
      usdc: {
        address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as any,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  },
};

/**
 * Get token address for a specific chain and token symbol
 */
export function getTokenAddress(
  chainId: number,
  tokenSymbol: string = 'usdc'
): string | undefined {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  return chain?.tokens[tokenSymbol.toLowerCase()]?.address;
}

/**
 * Get token config for a specific chain and token symbol
 */
export function getTokenConfig(chainId: number, tokenSymbol: string = 'usdc') {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  return chain?.tokens[tokenSymbol.toLowerCase()];
}

/**
 * Get chain config by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
}

/**
 * Get chain config by network name
 */
export function getChainConfigByName(networkName: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS[networkName.toLowerCase()];
}

/**
 * Check if a network is Solana-based
 * @param network - Network name or chain ID
 * @returns true if network is Solana
 */
export function isSolanaNetwork(network: string | number): boolean {
  if (typeof network === 'number') {
    return network === 1399811149 || network === 1399811150;
  }
  return network.toLowerCase().startsWith('solana');
}

/**
 * Get explorer URL for a transaction
 * @param network - Network name
 * @param txHash - Transaction hash
 * @returns Explorer URL
 */
export function getExplorerUrl(network: string, txHash: string): string {
  if (isSolanaNetwork(network)) {
    const isDevnet = network.toLowerCase().includes('devnet');
    return `https://solscan.io/tx/${txHash}${isDevnet ? '?cluster=devnet' : ''}`;
  }
  
  const chain = getChainConfigByName(network);
  if (chain?.blockExplorers?.default) {
    return `${chain.blockExplorers.default.url}/tx/${txHash}`;
  }
  
  return '';
}

