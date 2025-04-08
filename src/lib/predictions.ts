import supabase from "@/lib/supabase/createClient";

export type Prediction = {
  predictionId?: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  market_odds: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
};

export async function addPrediction(prediction: Prediction) {
  const { user_id, market_id, outcome_id, trade_value, trade_type } = prediction;

  // 1. Insert the prediction record.
  const { data: predictionData, error: predictionError } = await supabase
    .from("predictions")
    .insert(prediction)
    .select("*")
    .single();

  if (predictionError) {
    throw new Error(`Failed to add prediction: ${predictionError.message}`);
  }

  // 2. Update the user's balance in the profiles table.
  // Fetch the current balance.
  const { data: profileData, error: profileFetchError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", user_id)
    .single();

  if (profileFetchError) {
    throw new Error(`Failed to fetch profile: ${profileFetchError.message}`);
  }

  // Calculate the new balance
  // For buys: subtract trade_value (which is negative)
  // For sells: add trade_value (which is positive)
  const currentBalance = Number(profileData.balance);
  const newBalance = currentBalance + trade_value; // trade_value is already negative for buys

  // Update the balance.
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("user_id", user_id);

  if (profileUpdateError) {
    throw new Error(`Failed to update balance: ${profileUpdateError.message}`);
  }

  // 3. Update the outcome tokens in the outcomes table.
  // Fetch the current tokens value.
  const { data: outcomeData, error: outcomeFetchError } = await supabase
    .from("outcomes")
    .select("tokens")
    .eq("id", outcome_id)
    .single();

  if (outcomeFetchError) {
    throw new Error(`Failed to fetch outcome tokens: ${outcomeFetchError.message}`);
  }

  // Calculate the new tokens value
  // For buys: add the absolute value of trade_value
  // For sells: subtract the trade_value
  const currentTokens = Number(outcomeData.tokens);
  const newTokens = trade_type === 'buy' 
    ? currentTokens + Math.abs(trade_value) 
    : currentTokens - trade_value;

  // Update the tokens value.
  const { error: outcomeUpdateError } = await supabase
    .from("outcomes")
    .update({ tokens: newTokens })
    .eq("id", outcome_id);

  if (outcomeUpdateError) {
    throw new Error(`Failed to update outcome tokens: ${outcomeUpdateError.message}`);
  }

  // 4. Fetch all outcomes for the market and sum their tokens to update market token_pool.
  const { data: allOutcomes, error: outcomesFetchError } = await supabase
    .from("outcomes")
    .select("tokens")
    .eq("market_id", market_id);

  if (outcomesFetchError) {
    throw new Error(`Failed to fetch all outcomes: ${outcomesFetchError.message}`);
  }

  // Calculate total token pool by summing all outcome tokens.
  const totalTokenPool = allOutcomes.reduce((sum, outcome) => sum + Number(outcome.tokens), 0);

  // Update the market token_pool with the new total.
  const { error: marketUpdateError } = await supabase
    .from("markets")
    .update({ token_pool: totalTokenPool })
    .eq("id", market_id);

  if (marketUpdateError) {
    throw new Error(`Failed to update market token_pool: ${marketUpdateError.message}`);
  }

  return predictionData;
}