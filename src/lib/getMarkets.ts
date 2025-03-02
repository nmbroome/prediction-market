import supabase from "@/lib/supabase/createClient";

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[]; // Now including tags
}

export async function getMarkets(): Promise<Market[] | null> {
  const { data, error } = await supabase
    .from('markets')
    .select('id, name, description, token_pool, market_maker, tags');

  if (error) {
    console.error('Error fetching markets:', error.message);
    return null;
  }

  return data as Market[];
}
