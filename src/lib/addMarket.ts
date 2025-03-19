import supabase from "./supabase/createClient";

export interface Market {
  creator_id: string;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  close_date: string;
}

export async function addMarket(market: Market) {
  const { data, error } = await supabase.from('markets').insert(market).select('*').single();
  if (error || !data) {
    throw new Error(error?.message || 'Market creation failed');
  }
  return data;
}
