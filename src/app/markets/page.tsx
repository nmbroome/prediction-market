"use client"

import { useEffect, useState } from 'react';
import { getMarkets } from '@/lib/getMarkets';
import { MARKET_TAGS } from '@/lib/constants';
import MarketCard from '@/components/MarketCard';

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[]; // Array of tags for each market
  // You might add outcomes here if available:
  // outcomes: { title: string, odds: number }[];
}

export default function ViewMarkets() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [selectedTag, setSelectedTag] = useState("all");

  useEffect(() => {
    async function loadMarkets() {
      const data = await getMarkets();
      setMarkets(data);
    }
    loadMarkets();
  }, []);

  // Filter markets based on the selected tag (if not "all")
  const filteredMarkets =
    selectedTag === "all"
      ? markets
      : markets?.filter((market) => market.tags.includes(selectedTag));

  // Combine "all" with the other market tags
  const filterOptions = ["all", ...MARKET_TAGS];

  return (
    <div className='w-full h-full'>
      <div className='flex items-center justify-center'>
        <h1 className='text-lg font-bold mb-4'>Markets</h1>
      </div>

      {/* Filter Buttons */}
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

      {/* Markets Grid or No Markets Found Message */}
      <div className="p-8">
        {filteredMarkets && filteredMarkets.length > 0 ? (
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
