import supabase from "@/lib/supabase/createClient";
import { fixedPriceMarketMaker, cpmm_update } from "@/lib/marketMakers";

// Types
export interface UserBalance {
  balance: number;
  user_id: string;
}

export interface UserShares {
  [outcomeId: number]: number;
}

export interface TradeValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    userBalance?: number;
    userShares?: number;
    requiredAmount?: number;
    availableShares?: number;
  };
}

export interface TradePreview {
  sharesReceived: number;
  avgPrice: number;
  priceImpact: number;
  newOdds: number;
  expectedProfit: number;
  isValid: boolean;
  error: string | null;
}

export interface Outcome {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
}

// User Balance Functions
export async function getUserBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user balance: ${error.message}`);
  }

  return Number(data?.balance || 0);
}

export async function checkUserHasSufficientBalance(
  userId: string, 
  requiredAmount: number
): Promise<TradeValidationResult> {
  try {
    const balance = await getUserBalance(userId);
    
    if (balance < requiredAmount) {
      return {
        isValid: false,
        error: `Insufficient balance. You have $${balance.toFixed(2)} but need $${requiredAmount.toFixed(2)}.`,
        details: {
          userBalance: balance,
          requiredAmount: requiredAmount
        }
      };
    }

    return {
      isValid: true,
      details: {
        userBalance: balance,
        requiredAmount: requiredAmount
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Failed to check user balance"
    };
  }
}

// User Shares Functions
export async function getUserShares(userId: string, marketId: number): Promise<UserShares> {
  const { data, error } = await supabase
    .from("predictions")
    .select("outcome_id, shares_amt, trade_type")
    .eq("user_id", userId)
    .eq("market_id", marketId);

  if (error) {
    throw new Error(`Failed to fetch user shares: ${error.message}`);
  }

  // Get all outcomes for this market to initialize shares
  const { data: outcomes, error: outcomesError } = await supabase
    .from("outcomes")
    .select("id")
    .eq("market_id", marketId);

  if (outcomesError) {
    throw new Error(`Failed to fetch market outcomes: ${outcomesError.message}`);
  }

  const shares: UserShares = {};
  
  // Initialize all outcomes with 0 shares
  outcomes?.forEach(outcome => {
    shares[outcome.id] = 0;
  });
  
  // Calculate net shares for each outcome
  data?.forEach(pred => {
    const outcomeId = pred.outcome_id;
    const amount = pred.shares_amt || 0;
    if (pred.trade_type === 'buy') {
      shares[outcomeId] = (shares[outcomeId] || 0) + amount;
    } else if (pred.trade_type === 'sell') {
      shares[outcomeId] = (shares[outcomeId] || 0) - amount;
    }
  });

  return shares;
}

export async function checkUserHasSufficientShares(
  userId: string,
  marketId: number,
  outcomeId: number,
  requiredShares: number
): Promise<TradeValidationResult> {
  try {
    const userShares = await getUserShares(userId, marketId);
    const availableShares = userShares[outcomeId] || 0;
    
    // Format shares to avoid floating point precision issues
    const formattedAvailable = parseFloat(availableShares.toFixed(2));
    const formattedRequired = parseFloat(requiredShares.toFixed(2));
    
    if (formattedAvailable < formattedRequired) {
      return {
        isValid: false,
        error: `Insufficient shares. You have ${formattedAvailable.toFixed(2)} shares but need ${formattedRequired.toFixed(2)} shares.`,
        details: {
          userShares: formattedAvailable,
          requiredAmount: formattedRequired,
          availableShares: formattedAvailable
        }
      };
    }

    if (formattedAvailable <= 0) {
      return {
        isValid: false,
        error: "You don't own any shares of this outcome.",
        details: {
          userShares: formattedAvailable,
          availableShares: formattedAvailable
        }
      };
    }

    return {
      isValid: true,
      details: {
        userShares: formattedAvailable,
        availableShares: formattedAvailable,
        requiredAmount: formattedRequired
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Failed to check user shares"
    };
  }
}

// Market Liquidity Functions
export function checkMarketLiquidity(
  outcomes: Outcome[],
  selectedOutcomeId: number,
  tradeAmount: number
): TradeValidationResult {
  if (outcomes.length !== 2) {
    return {
      isValid: false,
      error: "Market must have exactly 2 outcomes for binary trading"
    };
  }

  const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId);
  const otherOutcome = outcomes.find(o => o.id !== selectedOutcomeId);

  if (!selectedOutcome || !otherOutcome) {
    return {
      isValid: false,
      error: "Could not find selected outcome in market"
    };
  }

  try {
    // Check if trade would exceed available tokens
    const sharesReceived = fixedPriceMarketMaker(
      selectedOutcome.tokens,
      otherOutcome.tokens,
      tradeAmount
    );

    if (sharesReceived > selectedOutcome.tokens) {
      return {
        isValid: false,
        error: `Not enough tokens available. You're trying to purchase ${sharesReceived.toFixed(2)} shares, but only ${selectedOutcome.tokens.toFixed(2)} tokens are available.`
      };
    }

    // Check CPMM constraints
    const [newSelectedTokens, newOtherTokens] = cpmm_update(
      selectedOutcome.tokens,
      otherOutcome.tokens,
      tradeAmount
    );

    if (newSelectedTokens < 0 || newOtherTokens < 0) {
      return {
        isValid: false,
        error: "Trade too large - would drain market liquidity"
      };
    }

    // Maintain minimum liquidity threshold
    const minLiquidity = 1;
    if (newSelectedTokens < minLiquidity || newOtherTokens < minLiquidity) {
      return {
        isValid: false,
        error: "Trade would leave insufficient market liquidity"
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Trade calculation failed"
    };
  }
}

// Trade Preview Functions
export function calculateBuyTradePreview(
  outcomes: Outcome[],
  selectedOutcomeId: number,
  tradeAmount: number
): TradePreview {
  if (outcomes.length !== 2 || tradeAmount <= 0) {
    return {
      sharesReceived: 0,
      avgPrice: 0,
      priceImpact: 0,
      newOdds: 0,
      expectedProfit: 0,
      isValid: false,
      error: "Invalid trade parameters"
    };
  }

  const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId);
  const otherOutcome = outcomes.find(o => o.id !== selectedOutcomeId);

  if (!selectedOutcome || !otherOutcome) {
    return {
      sharesReceived: 0,
      avgPrice: 0,
      priceImpact: 0,
      newOdds: 0,
      expectedProfit: 0,
      isValid: false,
      error: "Could not find outcomes"
    };
  }

  // Check liquidity first
  const liquidityCheck = checkMarketLiquidity(outcomes, selectedOutcomeId, tradeAmount);
  if (!liquidityCheck.isValid) {
    return {
      sharesReceived: 0,
      avgPrice: 0,
      priceImpact: 0,
      newOdds: 0,
      expectedProfit: 0,
      isValid: false,
      error: liquidityCheck.error || "Liquidity check failed"
    };
  }

  try {
    const currentTotalTokens = selectedOutcome.tokens + otherOutcome.tokens;
    const currentOdds = selectedOutcome.tokens / currentTotalTokens;

    // Calculate shares received
    const sharesReceived = fixedPriceMarketMaker(
      selectedOutcome.tokens,
      otherOutcome.tokens,
      tradeAmount
    );

    // Calculate new token distributions
    const [newSelectedTokens, newOtherTokens] = cpmm_update(
      selectedOutcome.tokens,
      otherOutcome.tokens,
      tradeAmount
    );

    // Calculate metrics
    const avgPrice = tradeAmount / sharesReceived;
    const newTotalTokens = newSelectedTokens + newOtherTokens;
    const newOdds = newSelectedTokens / newTotalTokens;
    const priceImpact = Math.abs(newOdds - currentOdds) / currentOdds * 100;
    const expectedProfit = sharesReceived - tradeAmount;

    return {
      sharesReceived,
      avgPrice,
      priceImpact,
      newOdds,
      expectedProfit,
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      sharesReceived: 0,
      avgPrice: 0,
      priceImpact: 0,
      newOdds: 0,
      expectedProfit: 0,
      isValid: false,
      error: error instanceof Error ? error.message : "Trade calculation failed"
    };
  }
}

export function calculateSellAmount(
  outcomes: Outcome[],
  selectedOutcomeId: number,
  sharesToSell: number
): number {
  if (outcomes.length !== 2) return 0;

  const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId);
  if (!selectedOutcome) return 0;

  const totalTokens = outcomes.reduce((sum, o) => sum + o.tokens, 0);
  const currentOdds = selectedOutcome.tokens / totalTokens;
  
  return sharesToSell * currentOdds;
}

// Maximum Trade Amount Functions
export function getMaxPurchaseAmount(
  outcomes: Outcome[],
  selectedOutcomeId: number
): number {
  if (outcomes.length !== 2) return 0;

  const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId);
  const otherOutcome = outcomes.find(o => o.id !== selectedOutcomeId);

  if (!selectedOutcome || !otherOutcome) return 0;

  const currentTotalTokens = selectedOutcome.tokens + otherOutcome.tokens;
  const currentOdds = selectedOutcome.tokens / currentTotalTokens;
  
  // Maximum shares we can buy = available tokens for this outcome
  const maxShares = selectedOutcome.tokens;
  
  // Maximum dollar amount = max shares × current odds
  const maxDollarAmount = maxShares * currentOdds;
  
  // Use binary search to find safe maximum amount considering CPMM constraints
  let low = 0;
  let high = maxDollarAmount;
  let safeMaxAmount = 0;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    
    try {
      const sharesReceived = fixedPriceMarketMaker(
        selectedOutcome.tokens,
        otherOutcome.tokens,
        mid
      );
      
      if (sharesReceived <= selectedOutcome.tokens) {
        const [newSelectedTokens, newOtherTokens] = cpmm_update(
          selectedOutcome.tokens,
          otherOutcome.tokens,
          mid
        );

        if (newSelectedTokens >= 1 && newOtherTokens >= 1) {
          safeMaxAmount = mid;
          low = mid;
        } else {
          high = mid;
        }
      } else {
        high = mid;
      }
    } catch {
      high = mid;
    }

    if (high - low < 0.01) break;
  }

  return Math.floor(safeMaxAmount * 100) / 100;
}

// Comprehensive Trade Validation
export async function validateTrade(
  userId: string,
  marketId: number,
  outcomeId: number,
  amount: number,
  tradeType: 'buy' | 'sell',
  outcomes: Outcome[]
): Promise<TradeValidationResult> {
  // Basic parameter validation
  if (amount <= 0) {
    return {
      isValid: false,
      error: "Trade amount must be greater than 0"
    };
  }

  if (outcomes.length !== 2) {
    return {
      isValid: false,
      error: "Market must have exactly 2 outcomes"
    };
  }

  try {
    if (tradeType === 'buy') {
      // Check user balance
      const balanceCheck = await checkUserHasSufficientBalance(userId, amount);
      if (!balanceCheck.isValid) {
        return balanceCheck;
      }

      // Check market liquidity
      const liquidityCheck = checkMarketLiquidity(outcomes, outcomeId, amount);
      if (!liquidityCheck.isValid) {
        return liquidityCheck;
      }

      return { isValid: true };
    } else {
      // For sells, check user has sufficient shares
      const sharesCheck = await checkUserHasSufficientShares(userId, marketId, outcomeId, amount);
      return sharesCheck;
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Trade validation failed"
    };
  }
}

// Utility Functions
export function formatShares(value: number, decimals: number = 2): number {
  return parseFloat(value.toFixed(decimals));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value);
}

export function getOutcomeProbability(outcome: Outcome, allOutcomes: Outcome[]): number {
  const totalTokens = allOutcomes.reduce((sum, o) => sum + o.tokens, 0);
  return totalTokens > 0 ? (outcome.tokens / totalTokens) * 100 : 0;
}