import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  TransactionMessage, 
  VersionedTransaction,
  ComputeBudgetProgram,
  TransactionInstruction,
  SystemProgram
} from '@solana/web3.js';
import { 
  createTransferCheckedInstruction, 
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { useOnchainWallet } from './useOnchainWallet';
import { useOnchainConfig } from '../context/OnchainConfigContext';
import type { UseOnchainPayConfig } from '../types/config';
import { DEFAULT_PRIORITY } from '../config/defaults';
import { verifyPayment, settlePayment, getRankedFacilitators, prepareBridge } from './shared/api';
import { validateAmount } from './shared/validation';
import type { PaymentParams, PaymentResult } from './useOnchainPay';

interface PaymentState {
  x402Header?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  priority?: string;
}

/**
 * Solana-specific payment hook using Solana wallet adapters
 * Supports Phantom, Solflare, and other Solana wallets
 */
export function useSolanaPay(config?: UseOnchainPayConfig) {
  const globalConfig = useOnchainConfig();
  const { address, isConnected, isPrivyUser } = useOnchainWallet();
  const { user } = usePrivy();
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();

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
   * Sign a Solana payment transaction
   * Implementation based on PayAI's x402-solana: github.com/PayAINetwork/x402-solana
   */
  const signSolanaPayment = useCallback(async (params: PaymentParams): Promise<{ x402Header: string }> => {
    if (!isConnected || !address) {
      throw new Error('Solana wallet not connected');
    }

    const { to, amount, token: paramToken, sourceNetwork, destinationNetwork } = params;
    
    // Determine if this is a cross-chain payment
    const isCrossChain = sourceNetwork && destinationNetwork && sourceNetwork !== destinationNetwork;
    
    // Get correct token config for Solana network
    const { SUPPORTED_CHAINS } = await import('../config/chains');
    const solanaChain = sourceNetwork?.includes('devnet') ? SUPPORTED_CHAINS.solanaDevnet : SUPPORTED_CHAINS.solana;
    const useToken = paramToken || solanaChain.tokens.usdc;

    // Callbacks
    finalConfig.callbacks.onSigningStart?.();

    // Parse amount to token atomic units
    const amountBigInt = validateAmount(amount, useToken.decimals);

    try {
      console.log('[Solana x402] Starting payment construction', {
        to,
        amount,
        isCrossChain,
        sourceNetwork,
        destinationNetwork,
      });

      // Create Solana public keys
      let userPubkey: PublicKey;
      try {
        userPubkey = new PublicKey(address);
        console.log('[Solana x402] User pubkey created:', userPubkey.toBase58());
      } catch (error: any) {
        throw new Error(`Invalid user address: ${address} - ${error.message}`);
      }
      
      // For cross-chain: send to adapter PDA from API (CCTP adapter vault)
      // For same-chain: send directly to recipient
      let destination: PublicKey;
      let actualRecipient: string;
      
      if (isCrossChain) {
        // Cross-chain: Send to adapter PDA (from /bridge/prepare)
        try {
          destination = new PublicKey(to); // Adapter PDA
          console.log('[Solana x402] Cross-chain destination (adapter PDA):', destination.toBase58());
        } catch (error: any) {
          throw new Error(`Invalid adapter PDA address from API: ${to} - ${error.message}`);
        }
        actualRecipient = params.to;
      } else {
        // Same-chain: Direct transfer to recipient
        try {
          destination = new PublicKey(to);
          console.log('[Solana x402] Same-chain destination:', destination.toBase58());
        } catch (error: any) {
          throw new Error(`Invalid recipient address: ${to} - ${error.message}`);
        }
        actualRecipient = to;
      }
      
      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(useToken.address);
        console.log('[Solana x402] Mint pubkey:', mintPubkey.toBase58());
      } catch (error: any) {
        throw new Error(`Invalid token mint address: ${useToken.address} - ${error.message}`);
      }

      // Get latest blockhash
      let blockhash: string;
      try {
        const blockh = await connection.getLatestBlockhash('confirmed');
        blockhash = blockh.blockhash;
        console.log('[Solana x402] Got latest blockhash:', blockhash.slice(0, 8) + '...');
      } catch (error: any) {
        throw new Error(`Failed to get blockhash from Solana: ${error.message}`);
      }

      // Determine token program (TOKEN vs TOKEN_2022)
      let programId: PublicKey;
      try {
        const mintInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
        programId = mintInfo?.owner?.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;
        console.log('[Solana x402] Token program:', programId.toBase58());
      } catch (error: any) {
        throw new Error(`Failed to fetch mint info: ${error.message}`);
      }

      // Fetch mint to get decimals
      let mint: any;
      try {
        mint = await getMint(connection, mintPubkey, undefined, programId);
        console.log('[Solana x402] Mint decimals:', mint.decimals);
      } catch (error: any) {
        throw new Error(`Failed to fetch mint: ${error.message}`);
      }

      // Get associated token accounts
      let sourceAta: PublicKey;
      let destinationAta: PublicKey;
      try {
        sourceAta = await getAssociatedTokenAddress(mintPubkey, userPubkey, false, programId);
        console.log('[Solana x402] Source ATA:', sourceAta.toBase58());
        
        // For cross-chain, destination is a PDA (off-curve), need allowOwnerOffCurve: true
        destinationAta = await getAssociatedTokenAddress(mintPubkey, destination, true, programId);
        console.log('[Solana x402] Destination ATA:', destinationAta.toBase58());
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString?.() || JSON.stringify(error);
        console.error('[Solana x402] getAssociatedTokenAddress failed:', {
          error,
          errorType: typeof error,
          errorMessage: errorMsg,
          mintPubkey: mintPubkey.toBase58(),
          userPubkey: userPubkey.toBase58(),
          destination: destination.toBase58(),
          programId: programId.toBase58(),
        });
        throw new Error(`Failed to derive token accounts: ${errorMsg}`);
      }

      // Check if source ATA exists (user must have tokens)
      try {
        const sourceAtaInfo = await connection.getAccountInfo(sourceAta, 'confirmed');
        if (!sourceAtaInfo) {
          throw new Error(`You don't have a ${useToken.symbol} token account. Please fund your Solana wallet with ${useToken.symbol} first.`);
        }
        console.log('[Solana x402] Source ATA exists, balance check passed');
      } catch (error: any) {
        if (error.message.includes("don't have")) throw error;
        throw new Error(`Failed to check source token account: ${error.message}`);
      }

      const instructions: TransactionInstruction[] = [];

      // CRITICAL: ComputeBudget instructions MUST be at positions 0 and 1
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 40_000,
        })
      );

      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1,
        })
      );
      console.log('[Solana x402] Added ComputeBudget instructions');

      // Check if destination ATA exists, create if needed
      let destAtaInfo: any;
      try {
        destAtaInfo = await connection.getAccountInfo(destinationAta, 'confirmed');
        console.log('[Solana x402] Destination ATA check:', destAtaInfo ? 'exists' : 'does not exist');
      } catch (error: any) {
        throw new Error(`Failed to check destination token account: ${error.message}`);
      }
      
      if (!destAtaInfo) {
        console.log('[Solana x402] Creating ATA instruction for destination');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        try {
          const createAtaInstruction = new TransactionInstruction({
            keys: [
              { pubkey: userPubkey, isSigner: false, isWritable: true },
              { pubkey: destinationAta, isSigner: false, isWritable: true },
              { pubkey: destination, isSigner: false, isWritable: false },
              { pubkey: mintPubkey, isSigner: false, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: programId, isSigner: false, isWritable: false },
            ],
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            data: Buffer.from([0]),
          });

          instructions.push(createAtaInstruction);
          console.log('[Solana x402] CreateATA instruction added');
        } catch (error: any) {
          throw new Error(`Failed to create ATA instruction: ${error.message}`);
        }
      }

      // SPL token transfer instruction
      try {
        const transferIx = createTransferCheckedInstruction(
          sourceAta,
          mintPubkey,
          destinationAta,
          userPubkey,
          BigInt(amountBigInt.toString()),
          mint.decimals,
          [],
          programId
        );
        instructions.push(transferIx);
        console.log('[Solana x402] Transfer instruction added:', {
          from: sourceAta.toBase58(),
          to: destinationAta.toBase58(),
          amount: amountBigInt.toString(),
          decimals: mint.decimals,
        });
      } catch (error: any) {
        throw new Error(`Failed to create transfer instruction: ${error.message}`);
      }

      // Get optimal facilitator from backend rankings
      const priority = params.priority || 'balanced';
      let topFacilitatorName: string;
      
      try {
        topFacilitatorName = await getRankedFacilitators({
          apiUrl: globalConfig.apiUrl,
          apiKey: globalConfig.apiKey || '',
          network: 'solana',
          priority,
        });
        console.log('[Solana x402] Top ranked facilitator:', topFacilitatorName);
      } catch (error: any) {
        throw new Error(`Facilitator selection failed: ${error.message}`);
      }
      
      // Get fee payer for selected facilitator
      const { getSolanaFeePayer } = await import('../config/solana');
      const feePayerAddress = getSolanaFeePayer(topFacilitatorName);
      const feePayer = new PublicKey(feePayerAddress);
      console.log('[Solana x402] Using fee payer:', feePayerAddress);
      
      // Create versioned transaction with selected facilitator's fee payer
      let transaction: VersionedTransaction;
      try {
        const message = new TransactionMessage({
          payerKey: feePayer,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message();

        transaction = new VersionedTransaction(message);
        console.log('[Solana x402] Transaction created with', instructions.length, 'instructions');
      } catch (error: any) {
        throw new Error(`Failed to build transaction: ${error.message}`);
      }

      // Sign with user's wallet
      let signedTransaction: VersionedTransaction;
      try {
        console.log('[Solana x402] Requesting wallet signature...');
        
        if (isPrivyUser && user?.wallet?.chainType === 'solana') {
          // @ts-ignore - Privy Solana wallet
          signedTransaction = await user.wallet.signTransaction(transaction);
          console.log('[Solana x402] Signed with Privy Solana wallet');
        } else if (solanaWallet.signTransaction) {
          signedTransaction = await solanaWallet.signTransaction(transaction);
          console.log('[Solana x402] Signed with external Solana wallet');
        } else {
          throw new Error('Solana wallet does not support transaction signing');
        }
      } catch (error: any) {
        const errorMsg = error.message || error.toString?.() || 'Unknown signing error';
        throw new Error(`Wallet signing failed: ${errorMsg}`);
      }

      finalConfig.callbacks.onSigningComplete?.();

      // Serialize partially-signed transaction
      let serializedTransaction: string;
      try {
        serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');
        console.log('[Solana x402] Transaction serialized, length:', serializedTransaction.length);
      } catch (error: any) {
        throw new Error(`Failed to serialize transaction: ${error.message}`);
      }

      // Create x402 payment header
      const payloadData: any = {
        transaction: serializedTransaction,
      };
      
      // For cross-chain payments, include destination info
      if (isCrossChain) {
        payloadData.destinationNetwork = destinationNetwork;
        payloadData.destinationAddress = actualRecipient;
        console.log('[Solana x402] Cross-chain metadata added:', {
          destinationNetwork,
          destinationAddress: actualRecipient,
        });
      }
      
      const x402Header = btoa(JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: params.sourceNetwork || 'solana',
        payload: payloadData,
      }));

      console.log('[Solana x402] x402 header created successfully');
      return { x402Header };
    } catch (error: any) {
      console.error('[Solana x402] ERROR:', error);
      console.error('[Solana x402] Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        name: error.name,
        code: (error as any).code,
      });
      
      throw new Error(`Solana payment failed: ${error.message || error.toString?.() || 'Unknown error'}`);
    }
  }, [address, isConnected, isPrivyUser, user, solanaWallet, connection, finalConfig, globalConfig]);

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
      const sourceNetwork = params.sourceNetwork || params.network || finalConfig.network || 'solana';
      const destinationNetwork = params.destinationNetwork || params.network || finalConfig.network || 'solana';
      const priority = params.priority || DEFAULT_PRIORITY;
      
      // Check if this is a cross-chain payment
      const isCrossChain = sourceNetwork !== destinationNetwork;
      let recipientAddress = params.to;
      let bridgeOrderId: string | undefined;

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

      // Solana signing
      console.log('[Verify] Calling signSolanaPayment with:', {
        to: recipientAddress,
        amount: params.amount,
        sourceNetwork,
        destinationNetwork,
      });
      
      let x402Header: string;
      try {
        const result = await signSolanaPayment({ ...params, to: recipientAddress, sourceNetwork, destinationNetwork });
        x402Header = result.x402Header;
        console.log('[Verify] Solana signing successful, header length:', x402Header.length);
      } catch (error: any) {
        console.error('[Verify] Solana signing failed:', error);
        throw error;
      }

      // Store state for potential settle call
      setPaymentState({ x402Header, sourceNetwork, destinationNetwork, priority });

      await verifyPayment({
        apiUrl: finalConfig.apiUrl,
        apiKey: finalConfig.apiKey,
        paymentHeader: x402Header,
        sourceNetwork,
        destinationNetwork,
        expectedAmount: params.amount,
        expectedToken: params.token?.symbol || finalConfig.token.symbol,
        recipientAddress: isCrossChain ? recipientAddress : params.to,
        priority,
        bridgeOrderId,
      });

      finalConfig.callbacks.onVerificationComplete?.();

      return { success: true, verified: true, x402Header, sourceNetwork, destinationNetwork, priority };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      params.onError?.(err);
      setError(err);
      return { success: false, error: err.message };
    } finally {
      setIsVerifying(false);
    }
  }, [finalConfig, signSolanaPayment]);

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

