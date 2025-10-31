import { useState } from 'react';
import { useSignTypedData } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useOnchainWallet } from './useOnchainWallet';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const DEFAULT_API_URL = 'https://api.onchain.fi';

export interface PaymentParams {
  /** Recipient address */
  to: string;
  
  /** Amount in USDC (e.g., "0.10" for 10 cents) */
  amount: string;
  
  /** Network (default: 'base') */
  network?: string;
  
  /** Routing priority (default: 'balanced') */
  priority?: 'speed' | 'cost' | 'reliability' | 'balanced';
  
  /** Success callback */
  onSuccess?: (txHash: string) => void;
  
  /** Error callback */
  onError?: (error: Error) => void;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Hook for making x402 payments through the Onchain aggregator
 */
export function useOnchainPay(apiKey?: string, apiUrl?: string) {
  const { address, isConnected, isPrivyUser } = useOnchainWallet();
  const { signTypedData: privySignTypedData } = usePrivy();
  const { signTypedDataAsync } = useSignTypedData();
  const [isPaying, setIsPaying] = useState(false);

  const pay = async (params: PaymentParams): Promise<PaymentResult> => {
    if (!isConnected || !address) {
      const error = new Error('Wallet not connected');
      params.onError?.(error);
      return { success: false, error: error.message };
    }

    if (!apiKey) {
      const error = new Error('Onchain API key not provided');
      params.onError?.(error);
      return { success: false, error: error.message };
    }

    setIsPaying(true);

    try {
      const { to, amount, network = 'base', priority = 'balanced' } = params;

      // Parse amount to USDC atomic units (6 decimals)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      // Generate random nonce
      const nonceArray = new Uint8Array(32);
      crypto.getRandomValues(nonceArray);
      const nonce = '0x' + Array.from(nonceArray).map(b => b.toString(16).padStart(2, '0')).join('');

      // EIP-712 domain
      const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: 8453, // Base mainnet
        verifyingContract: USDC_ADDRESS as `0x${string}`,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      };

      // Sign payment
      let signature: string;

      if (isPrivyUser && privySignTypedData) {
        // Privy requires string values
        const privyMessage = {
          from: address as `0x${string}`,
          to: to as `0x${string}`,
          value: amountBigInt.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce: nonce as `0x${string}`,
        };

        const result = await privySignTypedData({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message: privyMessage,
        });
        signature = result.signature;
      } else {
        // Wagmi supports BigInt values
        const value = {
          from: address as `0x${string}`,
          to: to as `0x${string}`,
          value: amountBigInt,
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce: nonce as `0x${string}`,
        };

        signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message: value,
        });
      }

      // Create x402 payment header
      const x402Header = btoa(JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network,
        payload: {
          signature,
          authorization: {
            from: address,
            to,
            value: amountBigInt.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      }));

      // Verify payment
      const verifyResponse = await fetch(`${apiUrl || DEFAULT_API_URL}/v1/verify`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentHeader: x402Header,
          network,
          expectedAmount: amount,
          expectedToken: 'USDC',
          recipientAddress: to,
          priority,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || verifyData.status !== 'success' || !verifyData.data?.valid) {
        throw new Error(verifyData.data?.reason || 'Payment verification failed');
      }

      // Settle payment
      const settleResponse = await fetch(`${apiUrl || DEFAULT_API_URL}/v1/settle`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentHeader: x402Header,
          network,
          priority,
        }),
      });

      const settleData = await settleResponse.json();
      if (!settleResponse.ok || settleData.status !== 'success' || !settleData.data?.settled) {
        throw new Error(settleData.data?.reason || 'Payment settlement failed');
      }

      const txHash = settleData.data.txHash || '';
      params.onSuccess?.(txHash);

      return { success: true, txHash };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      params.onError?.(err);
      return { success: false, error: err.message };
    } finally {
      setIsPaying(false);
    }
  };

  return {
    pay,
    isPaying,
    isReady: isConnected && !!apiKey,
  };
}

