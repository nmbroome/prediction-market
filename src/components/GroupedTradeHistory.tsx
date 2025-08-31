// src/components/GroupedTradeHistory.tsx - Updated to handle 'annulled' status

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabase/createClient";

// Enhanced interfaces for better data management
interface Market {
  id: number;
  name: string;
  description: string;
  status?: string;
  close_date?: string;
}

interface Outcome {
  id: number;
  name: string;
  market_id?: number;
  tokens: number;
}

interface Prediction {
  id: number;
  user_id: string;
  market_id: number;
  market?: Market;
  outcome_id: number;
  outcome?: Outcome;
  shares_amt: number;
  market_odds: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
  created_at: string;
  outcomes?: Outcome[]; // All outcomes in the market
}

// New interface for grouped predictions
interface GroupedPrediction {
  market_id: number;
  market_name: string;
  outcome_id: number;
  outcome_name: string;
  total_shares: number;
  total_value: number;
  current_odds: number;
  market_status: 'open' | 'closed' | 'resolved' | 'annulled';
  last_trade_date: string;
  predictions: Prediction[];
}

interface GroupedTradeHistoryProps {
  userId: string;
}

export default function GroupedTradeHistory({ userId }: GroupedTradeHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [groupedPredictions, setGroupedPredictions] = useState<GroupedPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };

  // Determine market status - Updated to handle 'annulled' status
  const getMarketStatus = (prediction: Prediction): 'open' | 'closed' | 'resolved' | 'annulled' => {
    if (!prediction.market) return 'closed';
    
    // First check if the market has an explicit status field
    if (prediction.market.status) {
      // Convert any string status to our expected format
      const status = prediction.market.status.toLowerCase();
      if (status === 'open' || status === 'closed' || status === 'resolved' || status === 'annulled') {
        return status as 'open' | 'closed' | 'resolved' | 'annulled';
      }
    }
    
    // If no explicit status or invalid status, determine based on close date
    const closeDate = prediction.market.close_date ? new Date(prediction.market.close_date + 'T00:00:00') : null;
    const now = new Date();
    
    if (!closeDate) return 'open';
    if (now > closeDate) return 'resolved';
    
    return 'open';
  };

  // Calculate current odds for an outcome based on all outcomes in the market
  const calculateCurrentOdds = (prediction: Prediction): number => {
    // For annulled markets, always return 0.5 (50%)
    if (getMarketStatus(prediction) === 'annulled') {
      return 0.5;
    }

    if (!prediction.outcomes || prediction.outcomes.length === 0) return 0;
    
    const totalTokens = prediction.outcomes.reduce((sum, o) => sum + o.tokens, 0);
    if (totalTokens === 0) return 0;
    
    const outcome = prediction.outcomes.find(o => o.id === prediction.outcome_id);
    if (!outcome) return 0;
    
    return (outcome.tokens / totalTokens);
  };

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
            markets:markets(id, name, description, close_date, status),
            outcomes:outcomes(id, name, tokens, market_id)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Define a type for the raw data from Supabase
        interface RawPredictionData {
          id: number;
          user_id: string;
          market_id: number;
          outcome_id: number;
          shares_amt: number;
          market_odds: number;
          trade_value: number;
          trade_type: 'buy' | 'sell';
          created_at: string;
          markets: {
            id: number;
            name: string;
            description: string;
            close_date?: string;
            status?: string;
          };
          outcomes: {
            id: number;
            name: string;
            tokens: number;
            market_id: number;
          };
        }
        
        // Safety type casting for Supabase response
        const typedData = data as unknown as RawPredictionData[];
        
        // Process the data to properly format it with nested market and outcome objects
        const processedData: Prediction[] = typedData.map((item) => {
          // Map raw data to our Prediction interface
          const prediction: Prediction = {
            id: item.id,
            user_id: item.user_id,
            market_id: item.market_id,
            outcome_id: item.outcome_id,
            shares_amt: item.shares_amt,
            market_odds: item.market_odds,
            trade_value: item.trade_value,
            trade_type: item.trade_type,
            created_at: item.created_at,
            market: {
              id: item.markets.id,
              name: item.markets.name,
              description: item.markets.description,
              close_date: item.markets.close_date,
              status: item.markets.status
            },
            outcome: item.outcomes
          };
          return prediction;
        });

        // For each prediction, fetch all outcomes in its market for calculating odds
        const predictionsWithOutcomes: Prediction[] = await Promise.all(
          processedData.map(async (prediction) => {
            const { data: outcomeData, error: outcomeError } = await supabase
              .from("outcomes")
              .select("id, name, tokens, market_id")
              .eq("market_id", prediction.market_id);
            
            if (outcomeError) throw outcomeError;
            
            // Define a type for the raw outcome data
            interface RawOutcomeData {
              id: number;
              name: string;
              tokens: number;
              market_id: number;
            }
            
            // Explicitly cast to conform to Outcome interface
            const typedOutcomes: Outcome[] = (outcomeData || []).map((item: RawOutcomeData) => ({
              id: item.id,
              name: item.name,
              tokens: item.tokens,
              market_id: item.market_id
            }));
            
            return {
              ...prediction,
              outcomes: typedOutcomes
            };
          })
        );

        setPredictions(predictionsWithOutcomes);

        // Group predictions by market and outcome
        const grouped = groupPredictionsByOutcome(predictionsWithOutcomes);
        setGroupedPredictions(grouped);
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

  // Group predictions by market and outcome
  const groupPredictionsByOutcome = (predictions: Prediction[]): GroupedPrediction[] => {
    // Create a map to hold the grouped trades
    const groupedMap = new Map<string, GroupedPrediction>();
    
    // Process each prediction
    predictions.forEach(prediction => {
      // Create a unique key for this market and outcome combination
      const key = `${prediction.market_id}-${prediction.outcome_id}`;
      
      // If this combination doesn't exist in our map yet, create it
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          market_id: prediction.market_id,
          market_name: prediction.market?.name || `Market #${prediction.market_id}`,
          outcome_id: prediction.outcome_id,
          outcome_name: prediction.outcome?.name || `Outcome #${prediction.outcome_id}`,
          total_shares: 0,
          total_value: 0,
          current_odds: calculateCurrentOdds(prediction),
          market_status: getMarketStatus(prediction),
          last_trade_date: prediction.created_at,
          predictions: []
        });
      }
      
      // Get the current grouped prediction
      const group = groupedMap.get(key)!;
      
      // Add this prediction to the group
      group.predictions.push(prediction);
      
      // Update totals
      // For buys, add shares and subtract value (negative trade_value)
      // For sells, subtract shares and add value (positive trade_value)
      if (prediction.trade_type === 'buy') {
        group.total_shares += prediction.shares_amt;
        group.total_value += prediction.trade_value; // Already negative for buys
      } else { // sell
        group.total_shares -= prediction.shares_amt;
        group.total_value += prediction.trade_value; // Already positive for sells
      }
      
      // Update the last trade date if this prediction is more recent
      if (new Date(prediction.created_at) > new Date(group.last_trade_date)) {
        group.last_trade_date = prediction.created_at;
      }
      
      // Update the group in the map
      groupedMap.set(key, group);
    });
    
    // Convert the map to an array and sort by last trade date (most recent first)
    return Array.from(groupedMap.values())
      .sort((a, b) => new Date(b.last_trade_date).getTime() - new Date(a.last_trade_date).getTime());
  };

  if (loading) return <div className="p-4 text-center text-white">Loading trade history...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (groupedPredictions.length === 0)
    return <div className="p-4 text-center text-white">No trade history available.</div>;

  return (
    <div className="mt-6 rounded-lg overflow-hidden border border-gray-700">
      <h3 className="text-xl font-bold p-4 bg-gray-800 text-white">
        Positions by Outcome
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Shares</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total P/L</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Odds</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Trade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {groupedPredictions.map((group) => (
              <tr key={`${group.market_id}-${group.outcome_id}`} className="hover:bg-gray-800 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {/* Market icon with first letter of market name */}
                    <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                      {group.market_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <Link
                        href={`/markets/${group.market_id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                      >
                        {group.market_name}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-sm rounded-full bg-blue-900 text-blue-200">
                    {group.outcome_name}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-white">
                  {group.total_shares.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`${group.total_value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(group.total_value)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-white">
                  {group.market_status === 'annulled' ? '50%' : `${(group.current_odds * 100).toFixed(0)}%`}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span 
                    className={`px-2 py-1 text-xs rounded-full ${
                      group.market_status === 'open' 
                        ? 'bg-green-900 text-green-200' 
                        : group.market_status === 'resolved' 
                          ? 'bg-blue-900 text-blue-200'
                          : group.market_status === 'annulled'
                            ? 'bg-yellow-900 text-yellow-200' 
                            : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {group.market_status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray-400">
                  {new Date(group.last_trade_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Link
                    href={`/markets/${group.market_id}`}
                    className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                  >
                    {group.market_status === 'open' ? 'Trade' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Detailed trades accordion (optional) */}
      <div className="p-4 bg-gray-800">
        <details className="mb-4">
          <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
            View all individual trades
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {predictions.map((prediction) => (
                  <tr key={prediction.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {prediction.market?.name || `Market #${prediction.market_id}`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {prediction.outcome?.name || `Outcome #${prediction.outcome_id}`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        prediction.trade_type === 'buy' 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-purple-900 text-purple-200'
                      }`}>
                        {prediction.trade_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-white">
                      {prediction.shares_amt.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`${prediction.trade_type === 'sell' ? 'text-green-400' : 'text-red-400'}`}>
                        {prediction.trade_type === 'buy' ? '-' : '+'}${Math.abs(prediction.trade_value).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-400">
                      {new Date(prediction.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}