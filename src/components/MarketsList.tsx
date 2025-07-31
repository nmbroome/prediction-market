// src/components/MarketsList.tsx - Updated to handle pending status

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
  status?: 'pending' | 'open' | 'closed' | 'annulled'; // Added 'pending'
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

  // Function to determine if market is current (open) or previous (closed/annulled)
  // IMPORTANT: Pending markets are filtered out at the API level, so they won't appear here
  const isCurrentMarket = (market: Market): boolean => {
    return market.status === 'open';
  };

  const isPreviousMarket = (market: Market): boolean => {
    return market.status === 'closed' || market.status === 'annulled';
  };

  // Filter markets by tag
  const tagFilteredMarkets = selectedTag === "all"
    ? markets
    : markets?.filter((m) => m.tags.includes(selectedTag));

  // Filter markets by status (current = open, previous = closed or annulled)
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

  return (
    <div className="w-full h-full">
      <h1 className="text-lg font-bold mb-4 text-center text-white">Markets</h1>

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
        </div>
      )}

      <div className="p-8">
        {filteredMarkets?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => (
              <MarketCard 
                key={market.id} 
                id={market.id}
                name={market.name}
                outcomes={market.outcomes}
                status={market.status}
                outcome_id={market.outcome_id}
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
  );
}