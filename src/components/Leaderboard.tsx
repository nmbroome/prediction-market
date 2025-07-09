"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";

interface LeaderboardEntry {
  user_id: string;
  username?: string;
  payment_id?: string | null;
  total_profit_loss: number;
  percent_pnl: number;
  total_bought_amount: number;
  remaining_shares_value: number;
  net_trade_pnl: number;
}

interface Profile {
  user_id: string;
  username?: string;
  payment_id?: string | null;
}

interface Prediction {
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
  created_at: string;
}

interface Outcome {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"absolute" | "percent">("absolute");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const fetchAndCalculateLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Get all users with their profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, username, payment_id");

        if (profilesError) throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
        if (!profiles) throw new Error("No user profiles found");

        // Filter out any users with null or undefined user_id
        const validProfiles = profiles.filter(profile => profile && profile.user_id) as Profile[];
        
        console.log(`Found ${validProfiles.length} valid profiles out of ${profiles.length} total`);

        // 2. Get all predictions from all markets (or filter by specific markets if needed)
        const { data: allPredictions, error: predictionsError } = await supabase
          .from("predictions")
          .select("user_id, market_id, outcome_id, shares_amt, trade_value, trade_type, created_at")
          .gt("market_id", 40); // Only include markets with ID > 40 (adjust as needed)

        if (predictionsError) {
          console.warn("Error fetching predictions:", predictionsError);
        }

        // 3. Get all outcomes to calculate current market odds
        const { data: allOutcomes, error: outcomesError } = await supabase
          .from("outcomes")
          .select("id, name, tokens, market_id")
          .gt("market_id", 40); // Only include outcomes from markets with ID > 40

        if (outcomesError) {
          console.warn("Error fetching outcomes:", outcomesError);
        }

        console.log(`Found ${allPredictions?.length || 0} predictions and ${allOutcomes?.length || 0} outcomes`);

        // 4. Process data for each user
        const leaderboardResults: LeaderboardEntry[] = [];

        for (const profile of validProfiles) {
          try {
            const userId = profile.user_id;
            
            // Get user's predictions
            const userPredictions = (allPredictions || []).filter(p => p.user_id === userId) as Prediction[];
            
            if (userPredictions.length === 0) {
              // Skip users with no predictions
              continue;
            }

            // Calculate total amounts bought (sum of absolute trade values for buy transactions)
            let totalBoughtAmount = 0;
            let netTradePnL = 0;
            
            // Track shares by outcome
            const sharesByOutcome: { [outcomeId: number]: number } = {};

            // Process each prediction
            userPredictions.forEach(prediction => {
              const tradeValue = Number(prediction.trade_value || 0);
              const sharesAmt = Number(prediction.shares_amt || 0);
              const outcomeId = prediction.outcome_id;

              // Add to net trade P&L (sum of all trade values)
              netTradePnL += tradeValue;

              if (prediction.trade_type === 'buy') {
                // For buys, add the absolute trade value to total bought amount
                totalBoughtAmount += Math.abs(tradeValue);
                
                // Add shares to position
                sharesByOutcome[outcomeId] = (sharesByOutcome[outcomeId] || 0) + sharesAmt;
              } else if (prediction.trade_type === 'sell') {
                // For sells, subtract shares from position
                sharesByOutcome[outcomeId] = (sharesByOutcome[outcomeId] || 0) - sharesAmt;
              }
            });

            // Calculate current value of remaining shares
            let remainingSharesValue = 0;

            Object.entries(sharesByOutcome).forEach(([outcomeIdStr, shares]) => {
              if (shares > 0) { // Only count positive positions
                const outcomeId = parseInt(outcomeIdStr);
                
                // Find the outcome and its market
                const outcome = (allOutcomes || []).find(o => o.id === outcomeId) as Outcome | undefined;
                if (!outcome) return;

                // Find all outcomes in the same market to calculate current odds
                const marketOutcomes = (allOutcomes || []).filter(o => o.market_id === outcome.market_id) as Outcome[];
                const totalMarketTokens = marketOutcomes.reduce((sum, o) => sum + Number(o.tokens), 0);
                
                if (totalMarketTokens > 0) {
                  // Current odds = outcome_tokens / total_market_tokens
                  const currentOdds = Number(outcome.tokens) / totalMarketTokens;
                  
                  // Value = shares * current_odds (this is what the shares would be worth if sold now)
                  const shareValue = shares * currentOdds;
                  remainingSharesValue += shareValue;
                  
                  console.log(`User ${userId}: ${shares} shares of outcome ${outcomeId} (${outcome.name}) worth ${shareValue.toFixed(3)} at ${(currentOdds * 100).toFixed(1)}% odds`);
                }
              }
            });

            // Calculate total profit/loss = net trade P&L + current value of remaining shares
            const totalProfitLoss = netTradePnL + remainingSharesValue;
            
            // Calculate percentage P&L based on total amount bought
            // Avoid division by zero
            const percentPnL = totalBoughtAmount > 0 ? (totalProfitLoss / totalBoughtAmount) * 100 : 0;

            leaderboardResults.push({
              user_id: userId,
              username: profile.username,
              payment_id: profile.payment_id,
              total_profit_loss: totalProfitLoss,
              percent_pnl: percentPnL,
              total_bought_amount: totalBoughtAmount,
              remaining_shares_value: remainingSharesValue,
              net_trade_pnl: netTradePnL
            });

            console.log(`User ${userId}: Bought $${totalBoughtAmount.toFixed(2)}, Net Trade P&L: $${netTradePnL.toFixed(2)}, Remaining Shares Value: $${remainingSharesValue.toFixed(2)}, Total P&L: $${totalProfitLoss.toFixed(2)}, Percent: ${percentPnL.toFixed(2)}%`);

          } catch (userError) {
            console.warn(`Skipping user ${profile.user_id} due to error:`, userError);
          }
        }

        // Filter users with activity (total bought amount > 0)
        const activeUsers = leaderboardResults.filter(
          entry => entry.total_bought_amount > 0
        );

        // Sort by the selected metric
        const sortedData = sortLeaderboardData(activeUsers, sortBy, sortDirection);

        setLeaderboardData(sortedData);
      } catch (err) {
        console.error("Error calculating leaderboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculateLeaderboardData();
  }, [sortBy, sortDirection]);
  
  // Sort the leaderboard data based on current sort parameters
  const sortLeaderboardData = (data: LeaderboardEntry[], sortMetric: "absolute" | "percent", direction: string) => {
    return [...data].sort((a, b) => {
      const valueA = sortMetric === "absolute" ? a.total_profit_loss : a.percent_pnl;
      const valueB = sortMetric === "absolute" ? b.total_profit_loss : b.percent_pnl;
      
      return direction === "desc" ? valueB - valueA : valueA - valueB;
    });
  };

  // Handle column header click
  const handleSortClick = (metric: "absolute" | "percent") => {
    // If clicking the same column, toggle direction
    if (sortBy === metric) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(newDirection);
      setLeaderboardData(sortLeaderboardData(leaderboardData, metric, newDirection));
    } else {
      // If clicking different column, switch to that column with desc order
      setSortBy(metric);
      setSortDirection("desc");
      setLeaderboardData(sortLeaderboardData(leaderboardData, metric, "desc"));
    }
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };
  
  // Format percentage values
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-pulse text-blue-500 flex items-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading leaderboard...
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      <strong className="font-bold">Error!</strong>
      <span className="block sm:inline"> {error}</span>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Prophet Market Leaderboard</h1>
      
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer ${sortBy === "absolute" ? "bg-gray-800" : ""}`}
                  onClick={() => handleSortClick("absolute")}
                >
                  Total Profit/Loss
                  {sortBy === "absolute" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer ${sortBy === "percent" ? "bg-gray-800" : ""}`}
                  onClick={() => handleSortClick("percent")}
                >
                  Percent P&L
                  {sortBy === "percent" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {leaderboardData.map((player, index) => (
                <tr key={player.user_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-yellow-400 mr-2">
                        #{index + 1}
                      </span>
                      {index === 0 && <span className="text-yellow-400">🏆</span>}
                      {index === 1 && <span className="text-gray-300">🥈</span>}
                      {index === 2 && <span className="text-orange-400">🥉</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {player.username || player.user_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold ${player.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(player.total_profit_loss)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold ${player.percent_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(player.percent_pnl)}
                    </div>
                  </td>
                </tr>
              ))}
              
              {leaderboardData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                    No leaderboard data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}