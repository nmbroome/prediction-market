"use client";

import { useMemo, useState } from "react";

// Only the fields the public leaderboard actually renders. Deliberately does
// NOT include payment_id or any other PII — the server strips those before this
// component ever sees the data (see app/leaderboard/page.tsx).
export interface SafeLeaderboardEntry {
  user_id: string;
  username?: string | null;
  total_profit_loss: number;
  percent_pnl: number;
}

interface RankedEntry extends SafeLeaderboardEntry {
  rank_change?: number;
  is_new?: boolean;
}

interface LeaderboardProps {
  current: SafeLeaderboardEntry[];
  previous: SafeLeaderboardEntry[] | null;
  error?: string | null;
}

function sortLeaderboardData(
  data: SafeLeaderboardEntry[],
  sortMetric: "absolute" | "percent",
  direction: "asc" | "desc"
) {
  return [...data].sort((a, b) => {
    const valueA = sortMetric === "absolute" ? a.total_profit_loss : a.percent_pnl;
    const valueB = sortMetric === "absolute" ? b.total_profit_loss : b.percent_pnl;
    return direction === "desc" ? valueB - valueA : valueA - valueB;
  });
}

export default function Leaderboard({ current, previous, error }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<"absolute" | "percent">("percent");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sorting + rank change are pure functions of the props — no fetching.
  const rows: RankedEntry[] = useMemo(() => {
    const sortedCurrent = sortLeaderboardData(current, sortBy, sortDirection);
    const sortedPrevious = previous
      ? sortLeaderboardData(previous, sortBy, sortDirection)
      : null;

    return sortedCurrent.map((entry, currentIndex) => {
      let rank_change: number | undefined;
      let is_new = false;

      if (sortedPrevious) {
        const previousIndex = sortedPrevious.findIndex((p) => p.user_id === entry.user_id);
        if (previousIndex !== -1) {
          // Positive = moved up, negative = moved down.
          rank_change = previousIndex - currentIndex;
        } else {
          is_new = true;
        }
      }

      return { ...entry, rank_change, is_new };
    });
  }, [current, previous, sortBy, sortDirection]);

  const renderRankChange = (player: RankedEntry) => {
    if (player.is_new) {
      return (
        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
          NEW
        </span>
      );
    }
    if (player.rank_change === undefined || player.rank_change === 0) {
      return <span className="ml-2 text-gray-500 text-sm">━</span>;
    }
    if (player.rank_change > 0) {
      return (
        <span className="ml-2 text-green-400 text-sm flex items-center">
          ↑{player.rank_change}
        </span>
      );
    }
    return (
      <span className="ml-2 text-red-400 text-sm flex items-center">
        ↓{Math.abs(player.rank_change)}
      </span>
    );
  };

  const handleSortClick = (metric: "absolute" | "percent") => {
    if (sortBy === metric) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(metric);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatPercentage = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

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
              {rows.map((player, index) => (
                <tr key={player.user_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-yellow-400 mr-2">#{index + 1}</span>
                      {renderRankChange(player)}
                      {index + 1 === 1 && <span className="text-yellow-400 ml-2">🏆</span>}
                      {index + 1 === 2 && <span className="text-gray-300 ml-2">🥈</span>}
                      {index + 1 === 3 && <span className="text-orange-400 ml-2">🥉</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {player.username || player.user_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold ${player.total_profit_loss >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(player.total_profit_loss)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold ${player.percent_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatPercentage(player.percent_pnl)}
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
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
