"use client";

import Link from 'next/link';

interface Outcome {
  name: string;
  tokens: number;
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

          {/* Total market value */}
          <div className="text-center text-sm text-gray-500">
            Total Market: $716,476
          </div>
        </div>
      </div>
    </Link>
  );
}