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
    <div className="w-full h-full">
      <h1 className="text-lg font-bold mb-4 text-center text-white">Markets</h1>

      {/* Market Status Summary */}
      {markets && (
        <div className="text-center mb-4">
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <span>
              <span className="text-green-400 font-medium">{counts.current}</span> Open
            </span>
            <span>
              <span className="text-blue-400 font-medium">{counts.resolved}</span> Resolved
            </span>
            <span>
              <span className="text-yellow-400 font-medium">{counts.annulled}</span> Annulled
            </span>
            <span>
              <span className="text-gray-300 font-medium">{counts.all}</span> Total
            </span>
          </div>
        </div>
      )}

      {/* Status Filter Buttons */}
      <div className="flex justify-center space-x-2 mb-4">
        {statusFilterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === option.value
                ? "bg-green-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {option.label}
            {option.value === 'current' && ` (${counts.current})`}
            {option.value === 'previous' && ` (${counts.previous})`}
            {option.value === 'all' && ` (${counts.all})`}
          </button>
        ))}
      </div>

      {/* Tag Filter Buttons */}
      <div className="flex justify-center flex-wrap gap-2 mb-4">
        {filterOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedTag === tag
                ? "bg-blue-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
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