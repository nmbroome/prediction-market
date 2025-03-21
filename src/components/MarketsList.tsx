"use client";

import { useEffect, useState } from "react";
import { getMarkets } from "@/lib/getMarkets";
import { MARKET_TAGS } from "@/lib/constants";
import MarketCard from "@/components/MarketCard";

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[];
}

export default function MarketsList() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [selectedTag, setSelectedTag] = useState("all");

  useEffect(() => {
    getMarkets().then(setMarkets);
  }, []);

  const filteredMarkets =
    selectedTag === "all"
      ? markets
      : markets?.filter((m) => m.tags.includes(selectedTag));

  const filterOptions = ["all", ...MARKET_TAGS];

  return (
    <div className="w-full h-full">
      <h1 className="text-lg font-bold mb-4 text-center">Markets</h1>

      <div className="flex justify-center space-x-4 mb-4">
        {filterOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-md ${
              selectedTag === tag
                ? "bg-blue-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-8">
        {filteredMarkets?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => (
              <MarketCard key={market.id} {...market} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No markets found</p>
        )}
      </div>
    </div>
  );
}
