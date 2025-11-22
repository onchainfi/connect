/**
 * Shared API utilities for payment verification and settlement
 */

export interface VerifyPaymentParams {
  apiUrl: string;
  apiKey: string;
  paymentHeader: string;
  sourceNetwork: string;
  destinationNetwork: string;
  expectedAmount: string;
  expectedToken: string;
  recipientAddress: string;
  finalRecipient?: string; // For two-hop samechain: original recipient
  priority: string;
  bridgeOrderId?: string;
  
  // Fee tracking (optional - calculated by UI)
  expectedFees?: {
    processingFee: string;
    ataFee?: string;
    totalFees: string;
  };
  needsATACreation?: boolean;
}

export interface SettlePaymentParams {
  apiUrl: string;
  apiKey: string;
  paymentId: string;            // REQUIRED: Payment ID from verify response
  paymentHeader: string;
  sourceNetwork: string;
  destinationNetwork: string;
  priority: string;
}

export interface FacilitatorRankingParams {
  apiUrl: string;
  apiKey: string;
  network: string;
  priority: string;
}

export interface BridgePrepareParams {
  apiUrl: string;
  apiKey: string;
  sourceNetwork: string;
  destinationNetwork: string;
  amount: string;
  recipientAddress: string;
}


/**
 * Call /v1/verify endpoint
 */
export async function verifyPayment(params: VerifyPaymentParams): Promise<any> {
  const response = await fetch(`${params.apiUrl}/v1/verify`, {
    method: 'POST',
    headers: {
      'X-API-Key': params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentHeader: params.paymentHeader,
      sourceNetwork: params.sourceNetwork,
      destinationNetwork: params.destinationNetwork,
      expectedAmount: params.expectedAmount,
      expectedToken: params.expectedToken,
      recipientAddress: params.recipientAddress,
      ...(params.finalRecipient && { finalRecipient: params.finalRecipient }),
      priority: params.priority,
      ...(params.bridgeOrderId && { bridgeOrderId: params.bridgeOrderId }),
      ...(params.expectedFees && { expectedFees: params.expectedFees }),
      ...(params.needsATACreation !== undefined && { needsATACreation: params.needsATACreation }),
    }),
  });

  const data = await response.json();
  
  if (!response.ok || data.status !== 'success' || !data.data?.valid) {
    const errorMessage = data.error?.message || data.message || data.data?.reason || 'Payment verification failed';
    const errorHint = data.error?.hint || '';
    const fullMessage = errorHint ? `${errorMessage} ${errorHint}` : errorMessage;
    throw new Error(fullMessage);
  }

  return data;
}

/**
 * Call /v1/settle endpoint
 */
export async function settlePayment(params: SettlePaymentParams): Promise<any> {
  const response = await fetch(`${params.apiUrl}/v1/settle`, {
    method: 'POST',
    headers: {
      'X-API-Key': params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentId: params.paymentId,           // REQUIRED: Unique payment ID from verify
      paymentHeader: params.paymentHeader,
      sourceNetwork: params.sourceNetwork,
      destinationNetwork: params.destinationNetwork,
      priority: params.priority,
    }),
  });

  const data = await response.json();
  
  if (!response.ok || data.status !== 'success' || !data.data?.settled) {
    const errorMessage = data.error?.message || data.message || data.data?.reason || 'Payment settlement failed';
    const errorHint = data.error?.hint || '';
    const fullMessage = errorHint ? `${errorMessage} ${errorHint}` : errorMessage;
    throw new Error(fullMessage);
  }

  return data;
}

/**
 * Get ranked facilitators for network/priority
 */
export async function getRankedFacilitators(params: FacilitatorRankingParams): Promise<string> {
  const response = await fetch(
    `${params.apiUrl}/v1/facilitators/ranked?network=${params.network}&priority=${params.priority}`,
    {
      headers: {
        'X-API-Key': params.apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get facilitator rankings: ${response.status}`);
  }

  const data = await response.json();
  const topFacilitatorName = data.data?.facilitators?.[0]?.facilitatorName;

  if (!topFacilitatorName) {
    throw new Error('No facilitators available');
  }

  return topFacilitatorName;
}

/**
 * Prepare cross-chain bridge transfer
 */
export async function prepareBridge(params: BridgePrepareParams): Promise<{ depositAddress: string; orderId: string }> {
  console.log('[Bridge Prepare] Calling /bridge/prepare:', {
    sourceNetwork: params.sourceNetwork,
    destinationNetwork: params.destinationNetwork,
    amount: params.amount,
    recipientAddress: params.recipientAddress,
  });

  const response = await fetch(`${params.apiUrl}/v1/bridge/prepare`, {
    method: 'POST',
    headers: {
      'X-API-Key': params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceNetwork: params.sourceNetwork,
      destinationNetwork: params.destinationNetwork,
      amount: params.amount,
      recipientAddress: params.recipientAddress,
    }),
  });

  const data = await response.json();
  console.log('[Bridge Prepare] Response:', data);

  if (!response.ok || data.status !== 'success') {
    const errorMessage = data.error?.message || data.message || 'Crosschain bridge preparation failed';
    const errorHint = data.error?.hint || '';
    const fullMessage = errorHint ? `${errorMessage} ${errorHint}` : errorMessage;
    throw new Error(fullMessage);
  }

  return {
    depositAddress: data.data.depositAddress,
    orderId: data.data.orderId,
  };
}


