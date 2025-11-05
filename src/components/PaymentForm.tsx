'use client';

import { useState, FormEvent } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useOnchainPay, PaymentParams } from '../hooks/useOnchainPay';
import { useOnchainWallet } from '../hooks/useOnchainWallet';
import type { TokenConfig } from '../types/config';

export interface PaymentFormProps {
  // Recipient
  recipientAddress?: string;
  recipientLabel?: string;
  recipientPlaceholder?: string;
  allowRecipientEdit?: boolean;

  // Amount
  defaultAmount?: string;
  amountLabel?: string;
  amountPlaceholder?: string;
  minAmount?: string;
  maxAmount?: string;

  // Token
  token?: TokenConfig;
  showTokenSelector?: boolean;

  // Network
  network?: string;
  showNetworkSelector?: boolean;

  // Priority
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';
  showPrioritySelector?: boolean;

  // Callbacks
  onSuccess?: (result: { txHash?: string }) => void;
  onError?: (error: Error) => void;
  onSubmit?: (params: PaymentParams) => void;

  // Styling
  className?: string;
  buttonText?: string;
  theme?: 'default' | 'minimal';
}

export function PaymentForm({
  recipientAddress: initialRecipient = '',
  recipientLabel = 'Recipient Address',
  recipientPlaceholder = '0x...',
  allowRecipientEdit = true,
  defaultAmount = '',
  amountLabel = 'Amount',
  amountPlaceholder = '0.01',
  minAmount = '0.01',
  maxAmount,
  token,
  showTokenSelector: _showTokenSelector = false,
  network,
  showNetworkSelector: _showNetworkSelector = false,
  priority = 'balanced',
  showPrioritySelector = false,
  onSuccess,
  onError,
  onSubmit,
  className = '',
  buttonText = 'Send Payment',
  theme = 'default',
}: PaymentFormProps) {
  const { isConnected } = useOnchainWallet();
  const { pay, isPaying } = useOnchainPay({ network, token });

  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(defaultAmount);
  const [selectedPriority, setSelectedPriority] = useState(priority);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Validate minimum amount
    const amountValue = parseFloat(amount);
    const minAmountValue = parseFloat(minAmount);
    if (isNaN(amountValue) || amountValue < minAmountValue) {
      setError(`Minimum payment amount is ${minAmount} ${token?.symbol || 'USDC'}`);
      return;
    }

    // Validate maximum amount if set
    if (maxAmount) {
      const maxAmountValue = parseFloat(maxAmount);
      if (amountValue > maxAmountValue) {
        setError(`Maximum payment amount is ${maxAmount} ${token?.symbol || 'USDC'}`);
        return;
      }
    }

    setSuccess(false);
    setError('');
    setTxHash('');

    const params: PaymentParams = {
      to: recipient,
      amount,
      network,
      token,
      priority: selectedPriority,
      onSuccess: (hash) => {
        setSuccess(true);
        setTxHash(hash);
        onSuccess?.({ txHash: hash });
      },
      onError: (err) => {
        setError(err.message);
        onError?.(err);
      },
    };

    onSubmit?.(params);
    await pay(params);
  };

  const baseInputClass = theme === 'minimal'
    ? 'w-full bg-transparent border-b border-gray-300 px-2 py-2 text-gray-900 focus:outline-none focus:border-purple-500 transition-colors'
    : 'w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-400 transition-colors';

  const buttonClass = theme === 'minimal'
    ? 'w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed'
    : 'w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-purple-900/50 disabled:to-purple-800/50 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed';

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-purple-300 mb-2">
            {recipientLabel}
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={recipientPlaceholder}
            className={baseInputClass}
            required
            disabled={isPaying || !allowRecipientEdit}
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-purple-300 mb-2">
            {amountLabel} {token ? `(${token.symbol})` : ''}
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={amountPlaceholder}
            step="0.01"
            min={minAmount}
            max={maxAmount}
            className={baseInputClass}
            required
            disabled={isPaying}
          />
        </div>

        {/* Priority Selector */}
        {showPrioritySelector && (
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-purple-300 mb-2">
              Priority
            </label>
            <select
              id="priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className={baseInputClass}
              disabled={isPaying}
            >
              <option value="balanced">Balanced</option>
              <option value="speed">Speed</option>
              <option value="cost">Cost</option>
              <option value="reliability">Reliability</option>
            </select>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isConnected || isPaying}
          className={buttonClass}
        >
          {isPaying ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processing...
            </>
          ) : (
            <>
              <Send size={20} />
              {buttonText}
            </>
          )}
        </button>
      </form>

      {/* Success Message */}
      {success && (
        <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
            <div>
              <p className="text-green-200 font-semibold text-sm">Payment Successful!</p>
              <p className="text-green-200/80 text-xs mt-1">
                Verified and settled through the x402 network.
              </p>
            </div>
          </div>
          {txHash && (
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-green-200/60 text-xs mb-1">Transaction Hash:</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-200 text-xs font-mono break-all underline"
              >
                {txHash}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
          <div className="flex-1 min-w-0">
            <p className="text-red-200 font-semibold text-sm">Payment Failed</p>
            <p className="text-red-200/80 text-xs mt-1 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Connection Warning */}
      {!isConnected && (
        <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-200/90 text-xs text-center">
            ⚠️ Please connect your wallet to send payments
          </p>
        </div>
      )}
    </div>
  );
}

