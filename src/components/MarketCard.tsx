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
  outcomes = [] // default to empty if not provided
}: MarketCardProps) {
  // Reorder outcomes so that the "yes" outcome appears first
  const sortedOutcomes = [
    ...outcomes.filter(outcome => outcome.name.toLowerCase() === "yes"),
    ...outcomes.filter(outcome => outcome.name.toLowerCase() !== "yes")
  ];

  // Define colors for bubbles: blue for the first outcome, purple for the second, and gray for any others.
  const bubbleColors = sortedOutcomes.map((_, index) => {
    if (index === 0) return "bg-blue-500";
    if (index === 1) return "bg-purple-500";
    return "bg-gray-500";
  });

  // Calculate total tokens for all outcomes
  const totalTokens = sortedOutcomes.reduce((sum, outcome) => sum + outcome.tokens, 0);

  return (
    <Link href={`/markets/${id}`}>
      <div className="border rounded-md p-4 shadow-md hover:shadow-lg transition duration-200 cursor-pointer w-80 h-64 flex flex-col justify-between">
        <h2 className="text-xl font-bold text-center">{name}</h2>
        
        {/* Outcome bubbles container */}
        {sortedOutcomes.length > 0 && (
          <div className="flex justify-center items-center gap-4">
            {sortedOutcomes.map((outcome, index) => {
              // Calculate odds only if totalTokens > 0 to avoid division by zero
              const odds = totalTokens ? (outcome.tokens / totalTokens) * 100 : 0;
              return (
                <div
                  key={index}
                  className={`w-32 h-16 flex items-center justify-center rounded-xl text-white ${bubbleColors[index]}`}
                >
                  {outcome.name}: {odds.toFixed(2)}%
                </div>
              );
            })}
          </div>
        )}

        {/* Optionally, you could show more details in a footer section */}
        <div className="text-center text-sm text-gray-500">
          Market close:
        </div>
      </div>
    </Link>
  );
}
