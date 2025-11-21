import { useState, useCallback, useEffect } from 'react';
import { useSignTypedData, useChainId } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useOnchainWallet } from './useOnchainWallet';
import { useOnchainConfig } from '../context/OnchainConfigContext';
import type { UseOnchainPayConfig } from '../types/config';
import { DEFAULT_PRIORITY } from '../config/defaults';
import { verifyPayment, settlePayment, prepareBridge } from './shared/api';
import { validateAmount, generateNonce, getValidityTimestamps } from './shared/validation';
import type { PaymentParams, PaymentResult } from './useOnchainPay';
import { getFeeConfig, DEFAULT_FEE_CONFIG, type FeeConfig } from './shared/feeConfig';

interface PaymentState {
  signature?: string;
  x402Header?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  priority?: string;
}

/**
 * EVM-specific payment hook using EIP-712 signatures
 * Supports Base, Optimism, Arbitrum, and other EVM chains
 */
export function useEvmPay(config?: UseOnchainPayConfig) {
  const globalConfig = useOnchainConfig();
  const { address, isConnected, isPrivyUser } = useOnchainWallet();
  const { signTypedData: privySignTypedData } = usePrivy();
  const { signTypedDataAsync } = useSignTypedData();
  const currentChainId = useChainId();

  // State
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string>();
  const [error, setError] = useState<Error>();
  const [paymentState, setPaymentState] = useState<PaymentState>({});
  const [feeConfig, setFeeConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);

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

  // Fetch dynamic fee configuration from API
  useEffect(() => {
    if (finalConfig.apiKey && finalConfig.apiUrl) {
      getFeeConfig(finalConfig.apiUrl, finalConfig.apiKey)
        .then((config) => {
          setFeeConfig(config);
          console.log('[useEvmPay] ✅ Fee config loaded:', {
            merchantTier: config.samechain.merchantTier,
            currentFee: config.samechain.currentFee,
            crosschainFee: config.crosschain.feePercent,
          });
        })
        .catch((err) => {
          console.warn('[useEvmPay] Failed to fetch fee config, using defaults:', err);
        });
    }
  }, [finalConfig.apiKey, finalConfig.apiUrl]);

  const reset = useCallback(() => {
    setIsPaying(false);
    setIsVerifying(false);
    setIsSettling(false);
    setLastTxHash(undefined);
    setError(undefined);
    setPaymentState({});
  }, []);

  /**
   * Sign an EVM payment using EIP-712
   */
  const signPayment = useCallback(async (params: PaymentParams): Promise<{ signature: string; x402Header: string }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const { to, amount, chainId: paramChainId, token: paramToken, sourceNetwork } = params;
    const useChainId = paramChainId || finalConfig.chainId;
    const useToken = paramToken || finalConfig.token;

    // CRITICAL: Pre-flight chain validation
    // Ensure wallet's actual chain matches the intended source network
    if (sourceNetwork) {
      const expectedChainId = sourceNetwork === 'base' ? 8453 : undefined;
      
      if (expectedChainId && currentChainId !== expectedChainId) {
        const errorMsg = `Chain mismatch: Wallet is on chain ${currentChainId}, but payment requires chain ${expectedChainId} (${sourceNetwork}). Please switch networks in your wallet.`;
        console.error('[useEvmPay] ❌ Pre-flight validation failed:', {
          currentChainId,
          expectedChainId,
          sourceNetwork,
        });
        throw new Error(errorMsg);
      }
    }

    // Callbacks
    finalConfig.callbacks.onSigningStart?.();

    // Parse amount to token atomic units
    const amountBigInt = validateAmount(amount, useToken.decimals);
    const { validAfter, validBefore } = getValidityTimestamps();

    // Generate random nonce
    const nonce = generateNonce();

    // Log payment construction
    console.log('[useEvmPay] 💳 Constructing EIP-712 signature:', {
      chainId: useChainId,
      sourceNetwork: sourceNetwork || 'not specified',
      token: useToken.symbol,
      amount,
      to: to.slice(0, 6) + '...' + to.slice(-4),
    });

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
      
      // Check if this is a cross-chain payment
      const isCrossChain = sourceNetwork !== destinationNetwork;
      const isSameChain = !isCrossChain;
      let recipientAddress = params.to;
      let bridgeOrderId: string | undefined;
      
      // Calculate fees using dynamic configuration from API
      const amountValue = parseFloat(params.amount);
      
      // Use fee config from API (fetched in useEffect)
      const feePercent = isCrossChain 
        ? feeConfig.crosschain.feePercent 
        : feeConfig.samechain.currentFee;
      
      let processingFee = (amountValue * feePercent) / 100;
      
      // Apply minimum for cross-chain
      if (isCrossChain) {
        const minFee = destinationNetwork.toLowerCase().includes('solana')
          ? feeConfig.crosschain.minimumFeeSolana
          : feeConfig.crosschain.minimumFeeBase;
        processingFee = Math.max(processingFee, minFee);
      }
      
      // Note: ATA fee handled by backend, not included in expectedFees here
      const expectedFees = {
        processingFee: processingFee.toFixed(6),
        totalFees: processingFee.toFixed(6),
      };
      
      console.log('[Verify] Calculated fees:', expectedFees);

      // For cross-chain: Get CCTP adapter address first
      if (isCrossChain) {
        const bridgeData = await prepareBridge({
          apiUrl: finalConfig.apiUrl,
          apiKey: finalConfig.apiKey,
          sourceNetwork,
          destinationNetwork,
          amount: params.amount,
          recipientAddress: params.to,
        });

        recipientAddress = bridgeData.depositAddress;
        bridgeOrderId = bridgeData.orderId;
        
        console.log('🌉 Cross-chain payment detected:', {
          originalRecipient: params.to,
          adapterAddress: recipientAddress,
          bridgeOrderId: bridgeOrderId,
          sourceNetwork,
          destinationNetwork,
        });
      }

      // For same-chain: Use intermediate wallet from config for two-hop
      let originalRecipient: string | undefined;
      if (isSameChain) {
        const { SUPPORTED_CHAINS } = await import('../config/chains');
        const baseChain = SUPPORTED_CHAINS.base;
        const intermediateWallet = baseChain.samechainIntermediateWallet;

        if (intermediateWallet) {
          originalRecipient = recipientAddress; // Save original before overwriting
          recipientAddress = intermediateWallet;
          
          console.log('💰 Same-chain two-hop payment:', {
            originalRecipient,
            intermediateWallet: recipientAddress,
            network: sourceNetwork,
          });
        } else {
          console.warn('⚠️ No intermediate wallet configured for Base - payment will fail');
        }
      }

      // EVM signing (EIP-712)
      console.log('[Verify] Calling signPayment (EVM) with:', {
        to: recipientAddress,
        amount: params.amount,
      });
      
      const { x402Header, signature } = await signPayment({ ...params, to: recipientAddress });
      console.log('[Verify] EVM signing successful');

      // Store state for potential settle call
      setPaymentState({ signature, x402Header, sourceNetwork, destinationNetwork, priority });

      await verifyPayment({
        apiUrl: finalConfig.apiUrl,
        apiKey: finalConfig.apiKey,
        paymentHeader: x402Header,
        sourceNetwork,
        destinationNetwork,
        expectedAmount: params.amount,
        expectedToken: params.token?.symbol || finalConfig.token.symbol,
        recipientAddress: recipientAddress, // For crosschain: adapter address, for samechain: intermediate wallet
        finalRecipient: originalRecipient, // For samechain two-hop: original recipient
        priority,
        bridgeOrderId,
        expectedFees,
        needsATACreation: false, // Backend will handle ATA detection
      });

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

      const data = await settlePayment({
        apiUrl: finalConfig.apiUrl,
        apiKey: finalConfig.apiKey,
        paymentHeader: x402Header,
        sourceNetwork,
        destinationNetwork,
        priority,
      });

      const txHash = data.data.txHash || '';
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
  }, [verify, finalConfig.autoSettle, settleInternal]);

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

