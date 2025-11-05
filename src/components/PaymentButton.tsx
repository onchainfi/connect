'use client';

import { ReactNode, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useOnchainPay } from '../hooks/useOnchainPay';
import { useOnchainWallet } from '../hooks/useOnchainWallet';
import type { TokenConfig } from '../types/config';

export interface PaymentButtonProps {
  /** Recipient address */
  to: string;

  /** Amount in token units */
  amount: string;

  /** Token config (optional, uses default) */
  token?: TokenConfig;

  /** Network (optional, uses default) */
  network?: string;

  /** Payment priority */
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';

  /** Button text/children */
  children?: ReactNode;

  /** Custom CSS class */
  className?: string;

  /** Success callback */
  onSuccess?: (txHash: string) => void;

  /** Error callback */
  onError?: (error: Error) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Show success state after payment */
  showSuccess?: boolean;
}

/**
 * One-click payment button with built-in state management
 */
export function PaymentButton({
  to,
  amount,
  token,
  network,
  priority = 'balanced',
  children,
  className,
  onSuccess,
  onError,
  disabled = false,
  showSuccess = true,
}: PaymentButtonProps) {
  const { isConnected } = useOnchainWallet();
  const { pay, isPaying } = useOnchainPay({ network, token });
  const [success, setSuccess] = useState(false);

  const handleClick = async () => {
    setSuccess(false);

    await pay({
      to,
      amount,
      token,
      network,
      priority,
      onSuccess: (txHash) => {
        if (showSuccess) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
        onSuccess?.(txHash);
      },
      onError: (error) => {
        onError?.(error);
      },
    });
  };

  const defaultClass = 
    'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-purple-900/50 disabled:to-purple-800/50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed';

  return (
    <button
      onClick={handleClick}
      disabled={!isConnected || isPaying || disabled || success}
      className={className || defaultClass}
    >
      {isPaying ? (
        <>
          <Loader2 className="animate-spin" size={18} />
          Processing...
        </>
      ) : success ? (
        <>
          <CheckCircle size={18} />
          Success!
        </>
      ) : (
        children || `Pay ${amount} ${token?.symbol || 'USDC'}`
      )}
    </button>
  );
}

