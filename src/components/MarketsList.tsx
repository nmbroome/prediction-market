// src/components/MarketsList.tsx - Updated to handle 'annulled' status

"use client";

import { useEffect, useState } from "react";
import { getMarkets } from "@/lib/getMarkets";
import { MARKET_TAGS } from "@/lib/constants";
import MarketCard from "@/components/MarketCard";

interface WinningOutcome {
  id: number;
  name: string;
}

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[];
  status?: 'pending' | 'open' | 'closed' | 'resolved' | 'annulled'; // Updated to include 'annulled'
  close_date?: string;
  outcome_id?: number | null;
  outcomes?: Array<{
    id: number;
    name: string;
    tokens: number;
  }>;
  winning_outcome?: WinningOutcome | null;
}

type MarketStatusFilter = 'all' | 'current' | 'previous';

export default function MarketsList() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [selectedTag, setSelectedTag] = useState("all");
  const [statusFilter, setStatusFilter] = useState<MarketStatusFilter>("current");

  useEffect(() => {
    getMarkets().then(setMarkets);
  }, []);

  // Function to determine if market is current (open) or previous (closed/resolved/annulled)
  // IMPORTANT: Pending markets are filtered out at the API level, so they won't appear here
  const isCurrentMarket = (market: Market): boolean => {
    return market.status === 'open';
  };

  const isPreviousMarket = (market: Market): boolean => {
    return market.status === 'closed' || market.status === 'resolved' || market.status === 'annulled';
  };

  // Filter markets by tag
  const tagFilteredMarkets = selectedTag === "all"
    ? markets
    : markets?.filter((m) => m.tags.includes(selectedTag));

  // Filter markets by status (current = open, previous = closed/resolved/annulled)
  // Note: Pending markets are already excluded from the API response
  const filteredMarkets = statusFilter === "all"
    ? tagFilteredMarkets
    : tagFilteredMarkets?.filter((market) => {
        if (statusFilter === "current") {
          return isCurrentMarket(market);
        } else if (statusFilter === "previous") {
          return isPreviousMarket(market);
        }
        
        return true;
      });

  const filterOptions = ["all", ...MARKET_TAGS];
  const statusFilterOptions: { value: MarketStatusFilter; label: string }[] = [
    { value: "all", label: "All Markets" },
    { value: "current", label: "Current Markets" },
    { value: "previous", label: "Previous Markets" }
  ];

  // Get count of markets by status for display
  const getMarketCounts = () => {
    if (!markets) return { all: 0, current: 0, previous: 0, resolved: 0, annulled: 0 };
    
    const all = markets.length;
    const current = markets.filter(isCurrentMarket).length;
    const previous = markets.filter(isPreviousMarket).length;
    const resolved = markets.filter(m => m.status === 'resolved').length;
    const annulled = markets.filter(m => m.status === 'annulled').length;
    
    return { all, current, previous, resolved, annulled };
  };

  const counts = getMarketCounts();

  return (
    <div className="w-full h-full pt-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Markets</h1>
        <p className="text-[var(--muted)] text-sm mt-2">
          Trade on real-world outcomes and track your forecasting edge.
        </p>
      </div>

      {/* Market Status Summary */}
      {markets && (
        <div className="flex justify-center flex-wrap gap-2.5 mb-6">
          {[
            { label: "Open", value: counts.current, dot: "bg-green-400" },
            { label: "Resolved", value: counts.resolved, dot: "bg-indigo-400" },
            { label: "Annulled", value: counts.annulled, dot: "bg-amber-400" },
            { label: "Total", value: counts.all, dot: "bg-slate-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
              <span className="text-sm font-semibold text-white">{stat.value}</span>
              <span className="text-xs text-[var(--muted)]">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter — segmented control */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          {statusFilterOptions.map((option) => {
            const count =
              option.value === "current" ? counts.current
              : option.value === "previous" ? counts.previous
              : counts.all;
            return (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? "bg-[var(--surface-hover)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-white"
                }`}
              >
                {option.label}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag Filter — ghost pills */}
      <div className="flex justify-center flex-wrap gap-2 mb-8 px-4">
        {filterOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedTag === tag
                ? "bg-indigo-500 border-indigo-500 text-white"
                : "bg-transparent border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border-strong)]"
            }`}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        ))}
      </div>

      {/* Results Summary */}
      {filteredMarkets && (
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            Showing {filteredMarkets.length} 
            {statusFilter === "current" && " current"}
            {statusFilter === "previous" && " previous"}
            {selectedTag !== "all" && ` ${selectedTag}`} 
            {" "}market{filteredMarkets.length !== 1 ? "s" : ""}
          </p>
          
          {/* Breakdown by status if showing all or previous markets */}
          {(statusFilter === "all" || statusFilter === "previous") && filteredMarkets.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {statusFilter === "all" && (
                <span>
                  {filteredMarkets.filter(isCurrentMarket).length} open, {" "}
                  {filteredMarkets.filter(m => m.status === 'resolved').length} resolved, {" "}
                  {filteredMarkets.filter(m => m.status === 'annulled').length} annulled
                </span>
              )}
              {statusFilter === "previous" && (
                <span>
                  {filteredMarkets.filter(m => m.status === 'resolved').length} resolved, {" "}
                  {filteredMarkets.filter(m => m.status === 'annulled').length} annulled, {" "}
                  {filteredMarkets.filter(m => m.status === 'closed').length} closed
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Markets Grid Container - Centered */}
      <div className="flex justify-center w-full">
        <div className="max-w-7xl w-full px-8">
          {filteredMarkets?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {filteredMarkets.map((market) => (
                <MarketCard 
                  key={market.id} 
                  id={market.id}
                  name={market.name}
                  outcomes={market.outcomes}
                  status={market.status}
                  winning_outcome={market.winning_outcome}
                />
              ))}
            </div>
          ) : markets === null ? (
            <p className="text-center text-gray-600">Loading markets...</p>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-2">No markets found</p>
              {statusFilter !== "all" && (
                <p className="text-gray-500 text-sm">
                  Try switching to {statusFilter === "current" ? "Previous" : "Current"} markets or selecting All Markets
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}