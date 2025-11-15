/**
 * Solana facilitator fee payers
 * Each facilitator sponsors transaction fees with their own account
 * These addresses are sourced from each facilitator's /supported endpoint
 * 
 * CRITICAL: Must be kept in sync with x402-aggregator-api/facilitators.config.json
 */
export const SOLANA_FEE_PAYERS: Record<string, string> = {
  'PayAI': '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
  'Anyspend': '34DmdeSbEnng2bmbSj9ActckY49km2HdhiyAwyXZucqP',
  'OctonetAI': '39uhTfNLqBiPvNQXeK1baNcScaVTCEj4iTxQwbEJukU1',
  'Aurracloud': '8x8CzkTHTYkW18frrTR7HdCV6fsjenvcykJAXWvoPQW',
};

/**
 * Get Solana fee payer address for a facilitator
 * 
 * @param facilitatorName - Name of the facilitator
 * @returns Fee payer address
 * @throws Error if facilitator not found
 */
export function getSolanaFeePayer(facilitatorName: string): string {
  const feePayer = SOLANA_FEE_PAYERS[facilitatorName];
  if (!feePayer) {
    throw new Error(`Solana fee payer not configured for facilitator: ${facilitatorName}`);
  }
  return feePayer;
}

