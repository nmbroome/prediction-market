"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import TradingForm from "@/components/TradeForm";
import PriceChart from "@/components/PriceChart";

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  status?: string;
  close_date?: string;
  outcome_id?: number | null;
}

interface Answer {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
}

interface WinningOutcome {
  id: number;
  name: string;
}

export default function MarketDetails() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [winningOutcome, setWinningOutcome] = useState<WinningOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | 'resolved'>('open');

  // Determine market status based on close_date or explicit status field
  const determineMarketStatus = (market: Market): 'open' | 'closed' | 'resolved' => {
    // First check if the market has an explicit status field
    if (market.status) {
      const status = market.status.toLowerCase();
      if (status === 'open' || status === 'closed' || status === 'resolved') {
        return status as 'open' | 'closed' | 'resolved';
      }
    }
    
    // If no explicit status or invalid status, determine based on close date
    const closeDate = market.close_date ? new Date(market.close_date) : null;
    const now = new Date();
    
    if (!closeDate) return 'open'; // No close date means market is open
    if (now > closeDate) return 'resolved'; // Past close date means resolved
    
    return 'open';
  };

  // Check if market is resolved (closed with winning outcome)
  const isResolved = (market: Market): boolean => {
    return market.status === 'closed' && market.outcome_id !== null;
  };

  // Fetch market data (both market details and outcomes).
  const fetchMarketData = useCallback(async () => {
    if (!id) return;

    try {
      const { data: marketData, error: marketError } = await supabase
        .from("markets")
        .select("id, name, description, token_pool, market_maker, status, close_date, outcome_id")
        .eq("id", id)
        .single();

      if (marketError) throw new Error(marketError.message);
      
      const market = marketData as Market;
      setMarket(market);
      
      // Set market status
      setMarketStatus(determineMarketStatus(market));

      const { data: answersData, error: answersError } = await supabase
        .from("outcomes")
        .select("id, name, tokens, market_id")
        .eq("market_id", id);

      if (answersError) throw new Error(answersError.message);
      setAnswers(answersData as Answer[]);

      // If market is resolved, fetch the winning outcome details
      if (isResolved(market) && market.outcome_id) {
        const { data: winningData, error: winningError } = await supabase
          .from("outcomes")
          .select("id, name")
          .eq("id", market.outcome_id)
          .single();

        if (winningError) {
          console.error("Error fetching winning outcome:", winningError.message);
        } else {
          setWinningOutcome(winningData as WinningOutcome);
        }
      } else {
        setWinningOutcome(null);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`Error fetching market data: ${e.message}`);
      } else {
        setError("Error fetching market data.");
      }
    }
  }, [id]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  if (!market) return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;

  // Calculate total tokens from all outcomes.
  const totalOutcomeTokens = answers.reduce((sum, answer) => sum + answer.tokens, 0);
  // Find the YES outcome.
  const yesOutcome = answers.find((answer) => answer.name.toUpperCase() === "YES");
  // Calculate YES odds as percentage of total outcome tokens.
  const yesOdds =
    yesOutcome && totalOutcomeTokens > 0
      ? ((yesOutcome.tokens / totalOutcomeTokens) * 100).toFixed(2) + "%"
      : "N/A";

  // Get a display label for market status
  const getStatusLabel = () => {
    if (isResolved(market) && winningOutcome) {
      return (
        <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium">
          Resolved: {winningOutcome.name} Won
        </span>
      );
    }

    switch (marketStatus) {
      case 'open':
        return <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">Open</span>;
      case 'closed':
        return <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">Closed</span>;
      case 'resolved':
        return <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto">
      {/* Market Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-4xl font-bold text-white">{market.name}</h1>
          {getStatusLabel()}
        </div>
        
        {/* Market Resolution Display */}
        {isResolved(market) && winningOutcome ? (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="text-center">
              <div className="text-lg text-green-300 mb-2">🎉 Market Resolved 🎉</div>
              <div className="text-2xl font-bold text-green-200">
                {winningOutcome.name} Won
              </div>
              <div className="text-sm text-green-400 mt-1">
                This market has been settled
              </div>
            </div>
          </div>
        ) : !isResolved(market) && marketStatus === 'open' ? (
          <p className="text-2xl mt-2 text-white">
            <strong>{yesOdds} Chance</strong>
          </p>
        ) : null}
        
        <p className="text-xl mt-2 text-white">
          <strong>Description:</strong> {market.description}
        </p>
        {market.close_date && (
          <p className="text-md mt-2 text-gray-300">
            Closes: {new Date(market.close_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Chart and Trading Form Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 items-start">
        {/* Price Chart - Takes up 2/3 of the width on large screens */}
        <div className="lg:col-span-2">
          <PriceChart 
            marketId={Number(id)} 
            height={500} 
          />
        </div>

        {/* Trading Form - Takes up 1/3 of the width on large screens */}
        <div className="lg:col-span-1 flex flex-col">
          {marketStatus === 'open' ? (
            <TradingForm />
          ) : (
            <div className="p-6 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C] text-center">
              <div>
                {isResolved(market) && winningOutcome ? (
                  <>
                    <div className="text-green-400 text-4xl mb-4">🏆</div>
                    <h3 className="text-xl text-white mb-2">Market Resolved</h3>
                    <div className="text-lg font-bold text-green-400 mb-2">
                      {winningOutcome.name} Won
                    </div>
                    <p className="text-gray-400">
                      This market has been settled. Winners can claim their payouts.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl text-white mb-2">
                      {marketStatus === 'closed' ? 'This market is closed' : 'This market has been resolved'}
                    </h3>
                    <p className="text-gray-400">
                      {marketStatus === 'closed' 
                        ? 'Trading is no longer available for this market.' 
                        : 'This market has been resolved. No further trading is possible.'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}