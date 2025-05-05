"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";

// Define interfaces for our data types
interface LeaderboardEntry {
  user_id: string;
  total_profit: number;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    async function fetchAndCalculateLeaderboardData() {
      setLoading(true);
      try {
        // Get all users with their profiles
        const { data: users, error: usersError } = await supabase
          .from("profiles")
          .select("user_id");

        if (usersError) throw new Error(`Failed to fetch user profiles: ${usersError.message}`);
        if (!users) throw new Error("No user profiles found");

        // Filter out any users with null or undefined user_id
        const validUsers = users.filter(user => user && user.user_id);
        
        console.log(`Found ${validUsers.length} valid users out of ${users.length} total`);

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
        
        // For each user, calculate their total profit
        for (const user of validUsers) {
          try {
            // Get trading PNL from predictions
            const tradingPNL = predictionsByUser[user.user_id] || 0;
            
            // Get user's total payouts
            const totalPayouts = payoutsByUser[user.user_id] || 0;

            // Calculate total profit (PNL + payouts)
            const totalProfit = tradingPNL + totalPayouts;

            leaderboardResults.push({
              user_id: user.user_id,
              total_profit: totalProfit
            });
          } catch (userError) {
            console.warn(`Skipping user ${user.user_id} due to error:`, userError);
          }
        }

        // Filter users with no activity
        const activeUsers = leaderboardResults.filter(
          entry => entry.total_profit !== 0
        );

        // Sort by total profit descending
        activeUsers.sort((a, b) => 
          sortDirection === 'desc' 
            ? b.total_profit - a.total_profit 
            : a.total_profit - b.total_profit
        );

        setLeaderboardData(activeUsers);
      } catch (err) {
        console.error("Error calculating leaderboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchAndCalculateLeaderboardData();
  }, [sortDirection]);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  User ID
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={toggleSortDirection}
                >
                  Total Profit
                  <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {leaderboardData.map((player, index) => (
                <tr key={player.user_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{player.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${player.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(player.total_profit)}
                    </div>
                  </td>
                </tr>
              ))}
              
              {leaderboardData.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-gray-400">
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