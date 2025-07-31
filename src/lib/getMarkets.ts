// src/lib/getMarkets.ts - Updated to exclude pending markets

import supabase from "@/lib/supabase/createClient";

interface Outcome {
  id: number;
  name: string;
  tokens: number;
}

interface WinningOutcome {
  id: number;
  name: string;
}

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[];
  status?: 'pending' | 'open' | 'closed' | 'annulled'; // Added 'pending'
  close_date?: string;
  outcome_id?: number | null;
  outcomes?: Outcome[];
  winning_outcome?: WinningOutcome | null;
}

export async function getMarkets(): Promise<Market[] | null> {
  const { data, error } = await supabase
    .from('markets')
    .select(`
      id,
      name,
      description,
      token_pool,
      market_maker,
      tags,
      status,
      close_date,
      outcome_id,
      outcomes!market_id( id, name, tokens )
    `)
    // CRITICAL: Filter out pending markets
    .neq('status', 'pending');

  if (error) {
    console.error('Error fetching markets:', error.message);
    return null;
  }

  // Process the data to add winning outcome information
  const processedData = await Promise.all(
    (data || []).map(async (market) => {
      let winning_outcome: WinningOutcome | null = null;
      
      // If market has an outcome_id, fetch the winning outcome
      if (market.outcome_id) {
        const { data: winningData, error: winningError } = await supabase
          .from('outcomes')
          .select('id, name')
          .eq('id', market.outcome_id)
          .single();
        
        if (!winningError && winningData) {
          winning_outcome = winningData as WinningOutcome;
        }
      }
      
      return {
        ...market,
        winning_outcome
      } as Market;
    })
  );

  return processedData;
}