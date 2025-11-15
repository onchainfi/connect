import { parseTokenAmount } from '../../config/tokens';
import type { TokenConfig } from '../../types/config';

/**
 * Validate and parse payment amount to atomic units
 */
export function validateAmount(amount: string, decimals: number): bigint {
  return parseTokenAmount(amount, decimals);
}

/**
 * Validate address format (basic validation)
 */
export function validateAddress(address: string, network: string): boolean {
  if (!address) return false;
  
  // EVM addresses start with 0x and are 42 chars
  if (network !== 'solana' && network !== 'solana-devnet') {
    return address.startsWith('0x') && address.length === 42;
  }
  
  // Solana addresses are base58, typically 32-44 chars
  return address.length >= 32 && address.length <= 44;
}

/**
 * Generate random nonce for EIP-712
 */
export function generateNonce(): string {
  const nonceArray = new Uint8Array(32);
  crypto.getRandomValues(nonceArray);
  return '0x' + Array.from(nonceArray).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get timestamp for EIP-712 validity
 */
export function getValidityTimestamps(): { validAfter: number; validBefore: number } {
  return {
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
}

