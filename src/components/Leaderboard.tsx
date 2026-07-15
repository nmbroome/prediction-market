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
        <span className="ml-2 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
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
      <div className="max-w-md mx-auto mt-10 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl">
        <strong className="font-semibold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const rankAccent = (rank: number) =>
    rank === 1 ? "text-amber-300"
    : rank === 2 ? "text-slate-300"
    : rank === 3 ? "text-orange-400"
    : "text-[var(--muted)]";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Leaderboard</h1>
        <p className="text-[var(--muted)] text-sm mt-2">Top forecasters ranked by realized performance.</p>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl shadow-lg shadow-black/20 overflow-hidden border border-[var(--border)]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-[var(--muted-2)] uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-[var(--muted-2)] uppercase tracking-wider">
                  User
                </th>
                <th
                  className={`px-4 sm:px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:text-white ${sortBy === "absolute" ? "text-white" : "text-[var(--muted-2)]"}`}
                  onClick={() => handleSortClick("absolute")}
                >
                  Total P/L
                  {sortBy === "absolute" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
                <th
                  className={`px-4 sm:px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:text-white ${sortBy === "percent" ? "text-white" : "text-[var(--muted-2)]"}`}
                  onClick={() => handleSortClick("percent")}
                >
                  Percent P&L
                  {sortBy === "percent" && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((player, index) => {
                const rank = index + 1;
                return (
                  <tr key={player.user_id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-base font-bold tabular-nums w-8 ${rankAccent(rank)}`}>#{rank}</span>
                        {rank === 1 && <span className="ml-1">🏆</span>}
                        {rank === 2 && <span className="ml-1">🥈</span>}
                        {rank === 3 && <span className="ml-1">🥉</span>}
                        {renderRankChange(player)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white max-w-[180px] truncate">
                        {player.username || player.user_id}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold tabular-nums ${player.total_profit_loss >= 0 ? "text-green-400" : "text-rose-400"}`}>
                        {formatCurrency(player.total_profit_loss)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-bold tabular-nums ${player.percent_pnl >= 0 ? "text-green-400" : "text-rose-400"}`}>
                        {formatPercentage(player.percent_pnl)}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[var(--muted)]">
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
