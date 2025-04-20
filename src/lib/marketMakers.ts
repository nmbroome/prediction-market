export function constantProductMarketMaker(
  outcome1_tokens: number,
  outcome2_tokens: number,
  predict_amt: number,
  min_tokens: number = 1.0 // Minimum tokens to maintain in each pool
): number {
  // Validate inputs
  if (predict_amt <= 0) {
    throw new Error("Prediction amount must be greater than zero.");
  }
  if (outcome1_tokens <= min_tokens || outcome2_tokens <= min_tokens) {
    throw new Error(`Token pools must be greater than ${min_tokens}.`);
  }

  const k = outcome1_tokens * outcome2_tokens;
  const new_outcome1_tokens = outcome1_tokens + predict_amt;
  
  // Calculate new token amount for outcome2
  const new_outcome2_tokens = k / new_outcome1_tokens;
  
  // Check if the trade would reduce outcome2 tokens below minimum threshold
  if (new_outcome2_tokens < min_tokens) {
    throw new Error(`Trade would reduce liquidity too much. Maximum trade amount: ${
      outcome1_tokens * (outcome2_tokens - min_tokens) / min_tokens
    }`);
  }
  
  const return_amt = outcome2_tokens - new_outcome2_tokens;
  
  // Double-check the final values
  if (return_amt < 0 || new_outcome2_tokens < min_tokens) {
    throw new Error("Invalid trade: would result in negative tokens.");
  }
  
  return return_amt;
}