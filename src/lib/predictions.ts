import supabase from "@/lib/supabase/createClient";

export interface Prediction {
  user_id: string;
  market_id: number;
  outcome_id: number;
  predict_amt: number;
  return_amt: number;
}

export async function addPrediction(prediction: Prediction) {
  const { user_id, market_id, outcome_id, predict_amt } = prediction;

  // 1. Insert the prediction record
  const { data: predictionData, error: predictionError } = await supabase
    .from("predictions")
    .insert(prediction)
    .select("*")
    .single();

  if (predictionError) {
    throw new Error(`Failed to add prediction: ${predictionError.message}`);
  }

  // 2. Update the user's balance in the profiles table
  // Fetch the current balance
  const { data: profileData, error: profileFetchError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", user_id)
    .single();

  if (profileFetchError) {
    throw new Error(`Failed to fetch profile: ${profileFetchError.message}`);
  }

  // Calculate the new balance (subtract predict_amt)
  const currentBalance = Number(profileData.balance);
  const newBalance = currentBalance - predict_amt;

  // Update the balance
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("user_id", user_id);

  if (profileUpdateError) {
    throw new Error(`Failed to update balance: ${profileUpdateError.message}`);
  }

  // 3. Update the outcome tokens in the outcomes table
  // Fetch the current tokens value
  const { data: outcomeData, error: outcomeFetchError } = await supabase
    .from("outcomes")
    .select("tokens")
    .eq("id", outcome_id)
    .single();

  if (outcomeFetchError) {
    throw new Error(`Failed to fetch outcome tokens: ${outcomeFetchError.message}`);
  }

  // Calculate the new tokens value (add predict_amt)
  const currentTokens = Number(outcomeData.tokens);
  const newTokens = currentTokens + predict_amt;

  // Update the tokens value
  const { error: outcomeUpdateError } = await supabase
    .from("outcomes")
    .update({ tokens: newTokens })
    .eq("id", outcome_id);

  if (outcomeUpdateError) {
    throw new Error(`Failed to update outcome tokens: ${outcomeUpdateError.message}`);
  }

  // 4. Update the market token pool in the markets table
  // Fetch the current token_pool value
  const { data: marketData, error: marketFetchError } = await supabase
    .from("markets")
    .select("token_pool")
    .eq("id", market_id)
    .single();

  if (marketFetchError) {
    throw new Error(`Failed to fetch market token pool: ${marketFetchError.message}`);
  }

  // Calculate the new token_pool (add predict_amt)
  const currentTokenPool = Number(marketData.token_pool);
  const newTokenPool = currentTokenPool + predict_amt;

  // Update the token_pool value
  const { error: marketUpdateError } = await supabase
    .from("markets")
    .update({ token_pool: newTokenPool })
    .eq("id", market_id);

  if (marketUpdateError) {
    throw new Error(`Failed to update market token_pool: ${marketUpdateError.message}`);
  }

  return predictionData;
}
