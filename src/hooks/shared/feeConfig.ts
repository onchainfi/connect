/**
 * Dynamic Fee Configuration
 * 
 * Fetches fee configuration from the API to ensure frontend
 * always shows accurate fee estimates matching backend calculations.
 * 
 * Features:
 * - Caching with 5-minute TTL to reduce API calls
 * - Fallback defaults if API is unavailable
 * - Automatic retry on failure
 */

export interface FeeConfig {
  samechain: {
    standard: number;        // Standard tier fee percentage (e.g., 0.1)
    reduced: number;         // Reduced tier fee percentage (e.g., 0.05)
    complimentary: number;   // Complimentary tier fee percentage (0)
    merchantTier: 'STANDARD' | 'REDUCED' | 'COMPLIMENTARY';
    currentFee: number;      // Merchant's actual fee based on their tier
  };
  crosschain: {
    feePercent: number;      // Cross-chain fee percentage (e.g., 1)
    minimumFeeBase: number;  // Minimum fee for Base cross-chain (e.g., 0.01)
    minimumFeeSolana: number; // Minimum fee for Solana cross-chain (e.g., 0.01)
  };
  ata: {
    creationFee: number;     // Solana ATA creation fee in USDC (e.g., 0.40)
    description?: string;    // Description of ATA fee
  };
}

/**
 * Default fee configuration (fallback if API is unavailable)
 * 
 * IMPORTANT: These should match backend defaults but are NOT authoritative.
 * Always prefer values from API when available.
 */
export const DEFAULT_FEE_CONFIG: FeeConfig = {
  samechain: {
    standard: 0.1,           // 0.1%
    reduced: 0.05,           // 0.05%
    complimentary: 0,        // 0%
    merchantTier: 'STANDARD',
    currentFee: 0.1,
  },
  crosschain: {
    feePercent: 1,           // 1% (was incorrectly 0.1% before)
    minimumFeeBase: 0.01,    // $0.01 minimum
    minimumFeeSolana: 0.01,  // $0.01 minimum
  },
  ata: {
    creationFee: 0.40,       // ~0.002 SOL in USDC
    description: 'One-time Solana rent-exempt fee for creating ATA account',
  },
};

// Cache management
let cachedFeeConfig: FeeConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch fee configuration from API with caching
 * 
 * @param apiUrl - Base URL of the Onchain API
 * @param apiKey - Merchant API key
 * @returns Fee configuration (from cache or API)
 */
export async function getFeeConfig(apiUrl: string, apiKey?: string): Promise<FeeConfig> {
  // Return cached if still valid
  if (cachedFeeConfig && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedFeeConfig;
  }

  // If no API key, return defaults (user not authenticated yet)
  if (!apiKey) {
    console.warn('[FeeConfig] No API key provided, using defaults');
    return DEFAULT_FEE_CONFIG;
  }

  try {
    const response = await fetch(`${apiUrl}/v1/fee-config`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fee config: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.status !== 'success' || !result.data) {
      throw new Error('Invalid fee config response format');
    }

    // Update cache
    cachedFeeConfig = result.data;
    cacheTimestamp = Date.now();

    console.log('[FeeConfig] ✅ Fetched from API:', {
      merchantTier: result.data.samechain.merchantTier,
      currentFee: result.data.samechain.currentFee,
      crosschainFee: result.data.crosschain.feePercent,
    });

    return result.data;
  } catch (error) {
    console.warn('[FeeConfig] Failed to fetch from API, using defaults:', error);
    
    // Return defaults but don't cache them (will retry next time)
    return DEFAULT_FEE_CONFIG;
  }
}

/**
 * Clear the fee config cache (useful for testing or manual refresh)
 */
export function clearFeeConfigCache(): void {
  cachedFeeConfig = null;
  cacheTimestamp = 0;
  console.log('[FeeConfig] Cache cleared');
}

/**
 * Get cached fee config without making API call
 * Returns null if cache is empty or expired
 */
export function getCachedFeeConfig(): FeeConfig | null {
  if (cachedFeeConfig && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedFeeConfig;
  }
  return null;
}

