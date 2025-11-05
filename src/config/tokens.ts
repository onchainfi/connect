import type { TokenConfig } from '../types/config';

/**
 * Common token configurations across chains
 */
export const COMMON_TOKENS: Record<string, Omit<TokenConfig, 'address'>> = {
  usdc: {
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  usdt: {
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
  },
  dai: {
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
  },
};

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmed = remainderStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Parse token amount string to BigInt
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  return BigInt(combined);
}

