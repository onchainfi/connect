'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import type { TokenConfig } from '../types/config';

export interface BalanceDisplayProps {
  /** Token to display balance for (optional, uses default USDC) */
  token?: TokenConfig;

  /** Address to check balance for (optional, uses connected wallet) */
  address?: `0x${string}`;

  /** Display format */
  format?: 'full' | 'compact' | 'symbol-only';

  /** Show refresh button */
  showRefresh?: boolean;

  /** Custom CSS class */
  className?: string;

  /** Custom label */
  label?: string;

  /** Auto-watch for balance changes */
  watch?: boolean;
}

/**
 * Display token balance with optional refresh
 */
export function BalanceDisplay({
  token,
  address,
  format = 'full',
  showRefresh = false,
  className = '',
  label,
  watch = true,
}: BalanceDisplayProps) {
  const { formatted, symbol, isLoading, refetch } = useBalance({
    token,
    address,
    watch,
  });

  if (isLoading && !formatted) {
    return (
      <div className={className || 'flex items-center gap-2 text-purple-300'}>
        <Loader2 className="animate-spin" size={16} />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const getDisplayText = () => {
    switch (format) {
      case 'compact':
        return `${formatted} ${symbol}`;
      case 'symbol-only':
        return formatted;
      case 'full':
      default:
        return label 
          ? `${label}: ${formatted} ${symbol}` 
          : `${formatted} ${symbol}`;
    }
  };

  return (
    <div className={className || 'flex items-center gap-2'}>
      <span className="text-purple-100 font-medium">{getDisplayText()}</span>
      {showRefresh && (
        <button
          onClick={() => refetch()}
          className="text-purple-400 hover:text-purple-300 transition-colors"
          title="Refresh balance"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

