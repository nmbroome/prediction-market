"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabase/createClient";

// Enhanced interfaces for better data management
interface Market {
  id: number;
  name: string;
  description: string;
  status: 'open' | 'closed' | 'resolved';
  close_date?: string;
}

interface Outcome {
  id: number;
  name: string;
  market_id: number;
  tokens: number;
}

interface Prediction {
  id: number;
  user_id: string;
  market_id: number;
  market?: Market;
  outcome_id: number;
  outcome?: Outcome;
  predict_amt: number;
  return_amt: number;
  buy_price: number;
  created_at: string;
  outcomes?: Outcome[]; // All outcomes in the market
}

interface TradeHistoryProps {
  userId: string;
}

export default function TradeHistory({ userId }: TradeHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true);
      setError(null);
      try {
        // Fetch predictions with market and outcome details
        const { data, error } = await supabase
          .from("predictions")
          .select(`
            *,
            markets:market_id(id, name, description, close_date),
            outcomes:outcome_id(id, name, tokens, market_id)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // For each prediction, fetch all outcomes in its market for calculating odds
        const predictionsWithOutcomes = await Promise.all(
          (data || []).map(async (prediction) => {
            const { data: outcomeData, error: outcomeError } = await supabase
              .from("outcomes")
              .select("id, name, tokens")
              .eq("market_id", prediction.market_id);
            
            if (outcomeError) throw outcomeError;
            
            return {
              ...prediction,
              outcomes: outcomeData || []
            };
          })
        );

        setPredictions(predictionsWithOutcomes);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Error fetching trade history";
        setError(errorMessage);
        console.error("Error fetching trade history:", err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchPredictions();
    }
  }, [userId]);

  // Calculate odds for an outcome based on all outcomes in the market
  const calculateOdds = (prediction: Prediction): string => {
    if (!prediction.outcomes || prediction.outcomes.length === 0) return "N/A";
    
    const totalTokens = prediction.outcomes.reduce((sum, o) => sum + o.tokens, 0);
    if (totalTokens === 0) return "0%";
    
    const outcome = prediction.outcomes.find(o => o.id === prediction.outcome_id);
    if (!outcome) return "N/A";
    
    const odds = (outcome.tokens / totalTokens) * 100;
    return `${odds.toFixed(0)}%`;
  };

  // Determine market status
  const getMarketStatus = (prediction: Prediction): 'open' | 'closed' | 'resolved' => {
    if (!prediction.market) return 'closed';
    
    const closeDate = prediction.market.close_date ? new Date(prediction.market.close_date) : null;
    const now = new Date();
    
    if (!closeDate) return 'open';
    
    return closeDate > now ? 'open' : 'resolved';
  };

  if (loading) return <div className="p-4 text-center text-white">Loading trade history...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (predictions.length === 0)
    return <div className="p-4 text-center text-white">No trade history available.</div>;

  return (
    <div className="mt-6 rounded-lg overflow-hidden border border-gray-700">
      <h3 className="text-xl font-bold p-4 bg-gray-800 text-white">Trade History</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Odds</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {predictions.map((prediction) => {
              const status = getMarketStatus(prediction);
              const market = prediction.market;
              const outcome = prediction.outcome;
              
              return (
                <tr key={prediction.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* Placeholder for market icon */}
                      <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                        {market?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="ml-4">
                        <Link
                          href={`/markets/${prediction.market_id}`}
                          className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                        >
                          {market?.name || `Market #${prediction.market_id}`}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-sm rounded-full bg-blue-900 text-blue-200">
                      {outcome?.name || `Outcome #${prediction.outcome_id}`}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`${prediction.predict_amt > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {prediction.predict_amt > 0 ? '+' : ''}{prediction.predict_amt.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-white">
                    {calculateOdds(prediction)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 text-xs rounded-full ${
                        status === 'open' 
                          ? 'bg-green-900 text-green-200' 
                          : status === 'resolved' 
                            ? 'bg-blue-900 text-blue-200' 
                            : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-gray-400">
                    {new Date(prediction.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}