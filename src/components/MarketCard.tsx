"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from "@/lib/supabase/createClient";

interface Outcome {
  name: string;
  tokens: number;
}

interface Prediction {
  predict_amt: number;
}

interface MarketCardProps {
  id: number;
  name: string;
  outcomes?: Outcome[];
}

export default function MarketCard({
  id,
  name,
  outcomes = []
}: MarketCardProps) {
  const [marketVolume, setMarketVolume] = useState<number | null>(null);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch market predictions to calculate volume
  useEffect(() => {
    async function fetchMarketVolume() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("predict_amt")
          .eq("market_id", id);

        if (error) {
          console.error("Error fetching market predictions:", error.message);
          setIsLoading(false);
          return;
        }

        // Calculate the total volume by summing all prediction amounts
        const totalVolume = data.reduce(
          (sum: number, prediction: Prediction) => sum + Math.abs(prediction.predict_amt),
          0
        );
        
        // Set the total number of trades
        setTradeCount(data.length);
        setMarketVolume(totalVolume);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch market volume:", err);
        setIsLoading(false);
      }
    }

    fetchMarketVolume();
  }, [id]);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Ensure "Yes" and "No" are the first two outcomes
  const sortedOutcomes = [
    ...outcomes.filter(outcome => outcome.name.toLowerCase() === "yes"),
    ...outcomes.filter(outcome => outcome.name.toLowerCase() === "no"),
    ...outcomes.filter(outcome => 
      outcome.name.toLowerCase() !== "yes" && 
      outcome.name.toLowerCase() !== "no")
  ];

  // Calculate total tokens for all outcomes
  const totalTokens = sortedOutcomes.reduce((sum, outcome) => sum + outcome.tokens, 0);

  return (
    <Link href={`/markets/${id}`}>
      <div className="bg-transparent border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-200 cursor-pointer w-80 overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white mb-4">{name}</h2>
          
          {/* Outcome bubbles container */}
          {sortedOutcomes.length > 0 && (
            <div className="flex justify-between items-center mb-4">
              {sortedOutcomes.slice(0, 2).map((outcome, index) => {
                // Calculate odds only if totalTokens > 0 to avoid division by zero
                const odds = totalTokens ? (outcome.tokens / totalTokens) * 100 : 0;
                const bgColor = outcome.name.toLowerCase() === "yes" ? "bg-blue-50" : "bg-purple-50";
                const textColor = outcome.name.toLowerCase() === "yes" ? "text-blue-600" : "text-purple-600";
                const borderColor = outcome.name.toLowerCase() === "yes" ? "border-blue-200" : "border-purple-200";

                return (
                  <div
                    key={index}
                    className={`flex flex-col justify-center items-center w-[calc(50%-0.5rem)] h-24 rounded-lg border ${bgColor} ${textColor} ${borderColor} p-2`}
                  >
                    <div className="text-sm font-medium">{outcome.name}</div>
                    <div className="text-2xl font-bold">{odds.toFixed(0)}%</div>
                    <div className="text-xs">$100 → ${(100 * odds / 100).toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Market stats - volume and trade count */}
          <div className="flex flex-col space-y-1">
            <div className="text-center text-sm text-gray-500">
              {isLoading ? (
                "Loading market data..."
              ) : (
                `Volume: ${marketVolume !== null ? formatCurrency(marketVolume) : "$0"}`
              )}
            </div>
            <div className="text-center text-sm text-gray-500">
              {isLoading ? (
                ""
              ) : (
                `Trades: ${tradeCount}`
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}