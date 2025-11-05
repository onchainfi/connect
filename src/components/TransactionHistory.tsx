'use client';

import { Loader2, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePaymentHistory } from '../hooks/usePaymentHistory';

export interface TransactionHistoryProps {
  /** Number of transactions to display per page */
  limit?: number;

  /** Address to fetch history for (optional, uses connected wallet) */
  address?: string;

  /** Auto-refresh interval in milliseconds */
  autoRefresh?: boolean;

  /** Refresh interval (ms) */
  refreshInterval?: number;

  /** Custom CSS class */
  className?: string;

  /** Show load more button */
  showLoadMore?: boolean;

  /** Block explorer base URL */
  explorerUrl?: string;
}

/**
 * Display transaction history with pagination
 */
export function TransactionHistory({
  limit = 10,
  address,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  showLoadMore = true,
  explorerUrl = 'https://basescan.org',
}: TransactionHistoryProps) {
  const { payments, isLoading, hasMore, loadMore } = usePaymentHistory({
    limit,
    address,
    autoRefresh,
    refreshInterval,
  });

  if (isLoading && payments.length === 0) {
    return (
      <div className={className || 'flex items-center justify-center py-12'}>
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className={className || 'text-center py-12'}>
        <p className="text-purple-300/60">No transactions yet</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-400" size={18} />;
      case 'failed':
        return <XCircle className="text-red-400" size={18} />;
      case 'pending':
      default:
        return <Clock className="text-yellow-400" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-black/40 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(payment.status)}
                <span className={`text-sm font-medium ${getStatusColor(payment.status)}`}>
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </div>
              <span className="text-xs text-purple-300/60">
                {new Date(payment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300">Amount:</span>
                <span className="text-sm font-mono text-purple-100">
                  {payment.amount} {payment.token}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300">To:</span>
                <span className="text-xs font-mono text-purple-100">
                  {payment.to.slice(0, 6)}...{payment.to.slice(-4)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300">Network:</span>
                <span className="text-xs text-purple-100 capitalize">{payment.network}</span>
              </div>

              {payment.facilitator && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-300">Facilitator:</span>
                  <span className="text-xs text-purple-100">{payment.facilitator}</span>
                </div>
              )}

              {payment.txHash && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-500/20">
                  <span className="text-xs text-purple-300">Transaction:</span>
                  <a
                    href={`${explorerUrl}/tx/${payment.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    View <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showLoadMore && hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full mt-4 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 hover:border-purple-400/50 rounded-lg py-3 text-purple-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading...
            </span>
          ) : (
            'Load More'
          )}
        </button>
      )}
    </div>
  );
}

