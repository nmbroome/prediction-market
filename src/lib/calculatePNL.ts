import supabase from "@/lib/supabase/createClient";

interface Prediction {
  id: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  market_odds: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
  created_at: string;
}

export async function calculatePNL(userId: string): Promise<{
  totalPNL: number;
  percentageChange: number;
}> {
  // Fetch all predictions for the given user
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const predictions = data as Prediction[];

  // Calculate total PNL by summing up the profit/loss of each trade
  // For buys: trade_value is negative (money spent)
  // For sells: trade_value is positive (money received)
  const totalPNL = predictions.reduce((acc, trade) => {
    return acc + trade.trade_value;
  }, 0);

  // Calculate the percentage change based on a starting amount of 100 tokens
  const startingAmount = 100;
  const percentageChange = (totalPNL / startingAmount) * 100;

  return { totalPNL, percentageChange };
}