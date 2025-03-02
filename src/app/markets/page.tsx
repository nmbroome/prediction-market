"use client"

import { useEffect, useState } from 'react';
import { getMarkets } from '@/lib/getMarkets';
import Link from 'next/link';

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  tags: string[]; // Array of tags for each market
}

export default function ViewMarkets() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [selectedTag, setSelectedTag] = useState("all");

  // Available filter tags including "all"
  const tags = ["all", "politics", "sports", "economics"];

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

  return (
    <div className='w-full h-full'>
      <div className='flex items-center justify-center'>
        <h1 className='text-lg font-bold mb-4'>Markets</h1>
      </div>

      {/* Filter Buttons */}
      <div className="flex justify-center space-x-4 mb-4">
        {tags.map((tag) => (
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

      {/* Markets Table */}
      <div className="flex items-center justify-center p-8">
        <table className="min-w-full bg-white shadow-md overflow-hidden">
          <thead>
            <tr className="bg-gray-800 text-white border-b">
              <th className="px-4 py-2">Market Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Token Pool</th>
              <th className="px-4 py-2">Market Maker</th>
              <th className="px-4 py-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarkets?.map((market) => (
              <tr key={market.id} className="border-b">
                <td className="px-4 py-2 bg-gray-600 text-white text-center hover:text-blue-500">
                  <Link href={`/markets/${market.id}`}>
                    {market.name}
                  </Link>
                </td>
                <td className="px-4 py-2 bg-gray-600 text-white text-center">
                  {market.description}
                </td>
                <td className="px-4 py-2 bg-gray-600 text-white text-center">
                  {market.token_pool}
                </td>
                <td className="px-4 py-2 bg-gray-600 text-white text-center">
                  {market.market_maker}
                </td>
                <td className="px-4 py-2 bg-gray-600 text-white text-center">
                  {market.tags.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
