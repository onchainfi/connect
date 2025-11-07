import { useState, useCallback } from 'react';
import { useSignTypedData, useChainId } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  TransactionMessage, 
  VersionedTransaction
} from '@solana/web3.js';
import { 
  createTransferCheckedInstruction, 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { useOnchainWallet } from './useOnchainWallet';
import { useOnchainConfig } from '../context/OnchainConfigContext';
import type { UseOnchainPayConfig, TokenConfig } from '../types/config';
import { parseTokenAmount } from '../config/tokens';
import { DEFAULT_PRIORITY } from '../config/defaults';
import { isSolanaNetwork } from '../config/chains';

export interface PaymentParams {
  /** Recipient address */
  to: string;
  
  /** Amount in token units (e.g., "0.10" for 10 cents) */
  amount: string;
  
  /** Source network - where payment originates (optional, auto-detected from wallet) */
  sourceNetwork?: string;
  
  /** Destination network - where recipient receives payment (required for cross-chain) */
  destinationNetwork?: string;
  
  /** Network (deprecated, use sourceNetwork/destinationNetwork instead) */
  network?: string;
  
  /** Chain ID (optional, uses config default) */
  chainId?: number;
  
  /** Token config (optional, uses config default) */
  token?: TokenConfig;
  
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
  verified?: boolean;
  settled?: boolean;
}

interface PaymentState {
  signature?: string;
  x402Header?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  priority?: string;
}

/**
 * Hook for making x402 payments through the Onchain aggregator
 * Supports verify/settle split flow and multi-chain payments
 */
export function useOnchainPay(config?: UseOnchainPayConfig) {
  const globalConfig = useOnchainConfig();
  const { address, isConnected, isPrivyUser } = useOnchainWallet();
  const { signTypedData: privySignTypedData, user } = usePrivy();
  const { signTypedDataAsync } = useSignTypedData();
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();
  const currentChainId = useChainId();

  // State
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string>();
  const [error, setError] = useState<Error>();
  const [paymentState, setPaymentState] = useState<PaymentState>({});

  // Merge config with global config
  const finalConfig = {
    apiKey: config?.apiKey || globalConfig.apiKey,
    apiUrl: config?.apiUrl || globalConfig.apiUrl,
    network: config?.network,
    chainId: config?.chainId || currentChainId,
    token: config?.token || globalConfig.defaultToken,
    autoVerify: config?.autoVerify ?? true,
    autoSettle: config?.autoSettle ?? true,
    retryOnFail: config?.retryOnFail ?? false,
    maxRetries: config?.maxRetries ?? 0,
    callbacks: config?.callbacks || {},
  };

  const reset = useCallback(() => {
    setIsPaying(false);
    setIsVerifying(false);
    setIsSettling(false);
    setLastTxHash(undefined);
    setError(undefined);
    setPaymentState({});
  }, []);

  /**
   * Sign a Solana payment by creating an actual SPL token transfer transaction
   * Per OctonetAI docs: requires versioned transaction, not just signed message
   */
  const signSolanaPayment = useCallback(async (params: PaymentParams): Promise<{ x402Header: string }> => {
    if (!isConnected || !address) {
      throw new Error('Solana wallet not connected');
    }

    const { to, amount, token: paramToken, sourceNetwork } = params;
    
    // Get correct token config for Solana network
    const { SUPPORTED_CHAINS } = await import('../config/chains');
    const solanaChain = sourceNetwork?.includes('devnet') ? SUPPORTED_CHAINS.solanaDevnet : SUPPORTED_CHAINS.solana;
    const useToken = paramToken || solanaChain.tokens.usdc;

    // Callbacks
    finalConfig.callbacks.onSigningStart?.();

    // Parse amount to token atomic units (USDC has 6 decimals on Solana)
    const amountInLamports = parseTokenAmount(amount, useToken.decimals);

    try {
      // Create Solana public keys
      const fromPubkey = new PublicKey(address);
      const toPubkey = new PublicKey(to);
      const mintPubkey = new PublicKey(useToken.address);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      // Create SPL token transfer instruction
      const transferInstruction = createTransferCheckedInstruction(
        fromTokenAccount,
        mintPubkey,
        toTokenAccount,
        fromPubkey,
        BigInt(amountInLamports.toString()),
        useToken.decimals,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create versioned transaction (v0) per OctonetAI spec
      const messageV0 = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Sign transaction
      let signedTransaction: VersionedTransaction;

      if (isPrivyUser && user?.wallet?.chainType === 'solana') {
        // Privy Solana wallet
        // @ts-ignore - Privy's wallet type
        const signedTx = await user.wallet.signTransaction(transaction);
        signedTransaction = signedTx;
      } else if (solanaWallet.signTransaction) {
        // External Solana wallet (Phantom, Solflare)
        signedTransaction = await solanaWallet.signTransaction(transaction);
      } else {
        throw new Error('Solana wallet does not support transaction signing');
      }

      finalConfig.callbacks.onSigningComplete?.();

      // Serialize transaction to base64
      const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

      // Create x402 payment header for Solana (per OctonetAI spec)
      const x402Header = btoa(JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: params.sourceNetwork || 'solana',
        payload: {
          transaction: serializedTransaction, // ← Key: use 'transaction', not 'message'
        },
      }));

      return { x402Header };
    } catch (error: any) {
      throw new Error(`Solana transaction creation failed: ${error.message}`);
    }
  }, [address, isConnected, isPrivyUser, user, solanaWallet, connection, finalConfig]);

  /**
   * Sign an EVM payment using EIP-712
   */
  const signPayment = useCallback(async (params: PaymentParams): Promise<{ signature: string; x402Header: string }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const { to, amount, chainId: paramChainId, token: paramToken } = params;
    const useChainId = paramChainId || finalConfig.chainId;
    const useToken = paramToken || finalConfig.token;

    // Callbacks
    finalConfig.callbacks.onSigningStart?.();

    // Parse amount to token atomic units
    const amountBigInt = parseTokenAmount(amount, useToken.decimals);
    const validAfter = 0;
    const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // Generate random nonce
    const nonceArray = new Uint8Array(32);
    crypto.getRandomValues(nonceArray);
    const nonce = '0x' + Array.from(nonceArray).map(b => b.toString(16).padStart(2, '0')).join('');

    // EIP-712 domain
    const domain = {
      name: useToken.name || 'USD Coin',
      version: '2',
      chainId: useChainId,
      verifyingContract: useToken.address as `0x${string}`,
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

    finalConfig.callbacks.onSigningComplete?.();

    // Create x402 payment header
    const x402Header = btoa(JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: params.sourceNetwork || params.network || finalConfig.network || 'base',
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

    return { signature, x402Header };
  }, [address, isConnected, isPrivyUser, privySignTypedData, signTypedDataAsync, finalConfig]);

  const verify = useCallback(async (params: PaymentParams): Promise<PaymentResult & { x402Header?: string; sourceNetwork?: string; destinationNetwork?: string; priority?: string }> => {
    if (!finalConfig.apiKey) {
      const error = new Error('Onchain API key not provided');
      params.onError?.(error);
      setError(error);
      return { success: false, error: error.message };
    }

    setIsVerifying(true);
    setError(undefined);

    try {
      finalConfig.callbacks.onVerificationStart?.();

      // Determine source and destination networks
      const sourceNetwork = params.sourceNetwork || params.network || finalConfig.network || 'base';
      const destinationNetwork = params.destinationNetwork || params.network || finalConfig.network || 'base';
      const priority = params.priority || DEFAULT_PRIORITY;

      // Route to appropriate signing method based on source network
      let x402Header: string;
      let signature: string | undefined;

      if (isSolanaNetwork(sourceNetwork)) {
        // Solana signing
        const result = await signSolanaPayment({ ...params, sourceNetwork, destinationNetwork });
        x402Header = result.x402Header;
      } else {
        // EVM signing (EIP-712)
        const result = await signPayment(params);
        x402Header = result.x402Header;
        signature = result.signature;
      }

      // Store state for potential settle call
      setPaymentState({ signature, x402Header, sourceNetwork, destinationNetwork, priority });

      const verifyResponse = await fetch(`${finalConfig.apiUrl}/v1/verify`, {
        method: 'POST',
        headers: {
          'X-API-Key': finalConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentHeader: x402Header,
          sourceNetwork,
          destinationNetwork,
          expectedAmount: params.amount,
          expectedToken: params.token?.symbol || finalConfig.token.symbol,
          recipientAddress: params.to,
          priority,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || verifyData.status !== 'success' || !verifyData.data?.valid) {
        throw new Error(verifyData.data?.reason || 'Payment verification failed');
      }

      finalConfig.callbacks.onVerificationComplete?.();

      // Return the payment data for immediate settle
      return { success: true, verified: true, x402Header, sourceNetwork, destinationNetwork, priority };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      params.onError?.(err);
      setError(err);
      return { success: false, error: err.message };
    } finally {
      setIsVerifying(false);
    }
  }, [finalConfig, signPayment]);

  // Internal settle function that takes explicit parameters
  const settleInternal = useCallback(async (
    x402Header: string,
    sourceNetwork: string,
    destinationNetwork: string,
    priority: string,
    params?: Partial<PaymentParams>
  ): Promise<PaymentResult> => {
    if (!finalConfig.apiKey) {
      const error = new Error('Onchain API key not provided');
      setError(error);
      return { success: false, error: error.message };
    }

    setIsSettling(true);
    setError(undefined);

    try {
      finalConfig.callbacks.onSettlementStart?.();

      const settleResponse = await fetch(`${finalConfig.apiUrl}/v1/settle`, {
        method: 'POST',
        headers: {
          'X-API-Key': finalConfig.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentHeader: x402Header,
          sourceNetwork,
          destinationNetwork,
          priority,
        }),
      });

      const settleData = await settleResponse.json();
      if (!settleResponse.ok || settleData.status !== 'success' || !settleData.data?.settled) {
        throw new Error(settleData.data?.reason || 'Payment settlement failed');
      }

      const txHash = settleData.data.txHash || '';
      setLastTxHash(txHash);

      finalConfig.callbacks.onSettlementComplete?.();
      params?.onSuccess?.(txHash);

      return { success: true, txHash, settled: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      params?.onError?.(err);
      setError(err);
      return { success: false, error: err.message };
    } finally {
      setIsSettling(false);
    }
  }, [finalConfig]);

  const settle = useCallback(async (params?: Partial<PaymentParams>): Promise<PaymentResult> => {
    if (!finalConfig.apiKey) {
      const error = new Error('Onchain API key not provided');
      setError(error);
      return { success: false, error: error.message };
    }

    if (!paymentState.x402Header) {
      const error = new Error('No payment to settle. Call verify() first.');
      setError(error);
      return { success: false, error: error.message };
    }

    return settleInternal(
      paymentState.x402Header,
      paymentState.sourceNetwork!,
      paymentState.destinationNetwork!,
      paymentState.priority!,
      params
    );
  }, [finalConfig, paymentState, settleInternal]);

  const pay = useCallback(async (params: PaymentParams): Promise<PaymentResult> => {
    setIsPaying(true);
    setError(undefined);

    try {
      // Verify
      const verifyResult = await verify(params);
      if (!verifyResult.success) {
        return verifyResult;
      }

      // Auto-settle if enabled
      if (finalConfig.autoSettle) {
        // Pass the x402Header directly instead of relying on state
        const settleResult = await settleInternal(
          verifyResult.x402Header!,
          verifyResult.sourceNetwork!,
          verifyResult.destinationNetwork!,
          verifyResult.priority!,
          params
        );
        return settleResult;
      }

      return verifyResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      params.onError?.(err);
      setError(err);
      return { success: false, error: err.message };
    } finally {
      setIsPaying(false);
    }
  }, [verify, finalConfig.autoSettle]);

  return {
    pay,
    verify,
    settle,
    isPaying,
    isVerifying,
    isSettling,
    isReady: isConnected && !!finalConfig.apiKey,
    lastTxHash,
    error,
    reset,
  };
}

