"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import TradingForm from "@/components/TradeForm";

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
}

interface Answer {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
}

export default function MarketDetails() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch market data (both market details and outcomes).
  const fetchMarketData = useCallback(async () => {
    if (!id) return;

    try {
      const { data: marketData, error: marketError } = await supabase
        .from("markets")
        .select("id, name, description, token_pool, market_maker")
        .eq("id", id)
        .single();

      if (marketError) throw new Error(marketError.message);
      setMarket(marketData as Market);

      const { data: answersData, error: answersError } = await supabase
        .from("outcomes")
        .select("id, name, tokens, market_id")
        .eq("market_id", id);

      if (answersError) throw new Error(answersError.message);
      setAnswers(answersData as Answer[]);
    } catch (e: any) {
      setError(`Error fetching market data: ${e.message}`);
    }
  }, [id]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  if (!market) return <div>Loading...</div>;

  // Calculate total tokens from all outcomes.
  const totalOutcomeTokens = answers.reduce((sum, answer) => sum + answer.tokens, 0);
  // Find the YES outcome.
  const yesOutcome = answers.find((answer) => answer.name.toUpperCase() === "YES");
  // Calculate YES odds as percentage of total outcome tokens.
  const yesOdds =
    yesOutcome && totalOutcomeTokens > 0
      ? ((yesOutcome.tokens / totalOutcomeTokens) * 100).toFixed(2) + "%"
      : "N/A";

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold">{market.name}</h1>
      <p className="text-2xl mt-2">
        <strong>{yesOdds} Chance</strong> 
      </p>
      <p className="text-xl mt-2">
        <strong>Description:</strong> {market.description}
      </p>

      {/* Render the TradingForm component */}
      <TradingForm />

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
