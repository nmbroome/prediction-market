"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";

// Define interfaces for our data types
interface LeaderboardEntry {
  user_id: string;
  username?: string;
  total_profit: number;
  percent_pnl: number;
  balance: number;
}

interface Profile {
  user_id: string;
  username?: string;
  balance: number;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"absolute" | "percent">("absolute");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    async function fetchAndCalculateLeaderboardData() {
      setLoading(true);
      try {
        // Get all users with their profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, username, balance, payment_id");

        if (profilesError) throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
        if (!profiles) throw new Error("No user profiles found");

        // Filter out any users with null or undefined user_id
        const validProfiles = profiles.filter(profile => profile && profile.user_id) as Profile[];
        
        console.log(`Found ${validProfiles.length} valid profiles out of ${profiles.length} total`);

        // Fetch all predictions at once for better performance
        const { data: allPredictions, error: predictionsError } = await supabase
          .from("predictions")
          .select("user_id, trade_value");

        if (predictionsError) {
          console.warn("Error fetching predictions:", predictionsError);
        }

        // Fetch all payouts at once
        const { data: allPayouts, error: allPayoutsError } = await supabase
          .from("payouts")
          .select("*");

        if (allPayoutsError) {
          console.warn("Error fetching all payouts:", allPayoutsError);
        }

        // Determine payout amount column name by checking common possibilities
        let payoutColumnName = "payout_amount";
        const possibleColumnNames = ["payout_amount", "amount", "payoutAmount", "value", "payout", "shares"];

        if (allPayouts && allPayouts.length > 0) {
          const firstPayoutRecord = allPayouts[0];
          
          for (const colName of possibleColumnNames) {
            if (colName in firstPayoutRecord && typeof firstPayoutRecord[colName] === 'number') {
              payoutColumnName = colName;
              console.log(`Found payout amount in column: ${payoutColumnName}`);
              break;
            }
          }
        }

        // Group predictions by user_id for faster lookup
        const predictionsByUser: Record<string, number> = {};
        if (allPredictions && allPredictions.length > 0) {
          allPredictions.forEach(prediction => {
            const userId = prediction.user_id;
            const value = Number(prediction.trade_value || 0);
            
            if (!predictionsByUser[userId]) {
              predictionsByUser[userId] = 0;
            }
            
            predictionsByUser[userId] += value;
          });
        }

        // Group payouts by user_id for faster lookup
        const payoutsByUser: Record<string, number> = {};
        if (allPayouts && allPayouts.length > 0) {
          allPayouts.forEach(payout => {
            const userId = payout.user_id;
            // Try each column name until we find a valid number
            let amount = 0;
            for (const colName of possibleColumnNames) {
              if (colName in payout && !isNaN(Number(payout[colName]))) {
                amount = Number(payout[colName] || 0);
                break;
              }
            }
            
            if (!payoutsByUser[userId]) {
              payoutsByUser[userId] = 0;
            }
            
            payoutsByUser[userId] += amount;
          });
        }

        const leaderboardResults: LeaderboardEntry[] = [];
        
        // For each user, calculate their total profit and percent PNL
        for (const profile of validProfiles) {
          try {
            // Get trading PNL from predictions
            const tradingPNL = predictionsByUser[profile.user_id] || 0;
            
            // Get user's total payouts
            const totalPayouts = payoutsByUser[profile.user_id] || 0;

            // Calculate total profit (PNL + payouts)
            const totalProfit = tradingPNL + totalPayouts;
            
            // Get user's balance (or default to 100 if not available)
            const balance = profile.balance || 100;
            
            // Calculate percentage PNL based on the balance
            // Avoid division by zero
            const percentPNL = balance > 0 ? (totalProfit / balance) * 100 : 0;

            leaderboardResults.push({
              user_id: profile.user_id,
              username: profile.username,
              total_profit: totalProfit,
              percent_pnl: percentPNL,
              balance: balance
            });
          } catch (userError) {
            console.warn(`Skipping user ${profile.user_id} due to error:`, userError);
          }
        }

        // Filter users with no activity
        const activeUsers = leaderboardResults.filter(
          entry => entry.total_profit !== 0 || entry.percent_pnl !== 0
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
    }

    fetchAndCalculateLeaderboardData();
  }, [sortBy, sortDirection]);
  
  // Sort the leaderboard data based on current sort parameters
  const sortLeaderboardData = (data: LeaderboardEntry[], sortMetric: "absolute" | "percent", direction: string) => {
    return [...data].sort((a, b) => {
      const valueA = sortMetric === "absolute" ? a.total_profit : a.percent_pnl;
      const valueB = sortMetric === "absolute" ? b.total_profit : b.percent_pnl;
      
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
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer ${sortBy === "absolute" ? "bg-gray-800" : ""}`}
                  onClick={() => handleSortClick("absolute")}
                >
                  Total Profit
                  {sortBy === "absolute" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
                <th 
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer ${sortBy === "percent" ? "bg-gray-800" : ""}`}
                  onClick={() => handleSortClick("percent")}
                >
                  Percent PNL
                  {sortBy === "percent" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {leaderboardData.map((player, index) => {
                // Calculate rank based on current position in sorted array
                const rank = index + 1;
                
                return (
                  <tr key={player.user_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* Special styling for top 3 positions */}
                        <div className={`text-lg font-bold ${
                          rank === 1 ? 'text-yellow-400' :
                          rank === 2 ? 'text-gray-300' :
                          rank === 3 ? 'text-amber-600' :
                          'text-white'
                        }`}>
                          {rank === 1 && '🥇'}
                          {rank === 2 && '🥈'}
                          {rank === 3 && '🥉'}
                          {rank > 3 && `#${rank}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {player.username || player.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${player.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(player.total_profit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${player.percent_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(player.percent_pnl)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {leaderboardData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                    No leaderboard data available yet
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