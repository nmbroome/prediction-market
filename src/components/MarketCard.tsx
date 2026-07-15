// src/components/MarketCard.tsx - Updated to handle 'annulled' status

"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from "@/lib/supabase/createClient";

interface Outcome {
  id: number;
  name: string;
  tokens: number;
}

interface WinningOutcome {
  id: number;
  name: string;
}

interface Prediction {
  trade_value: number;
  trade_type: 'buy' | 'sell';
  market_odds: number;
  created_at: string;
}

interface PriceChangeData {
  currentPrice: number;
  previousPrice: number;
  changeAmount: number;
  changePercentage: number;
  hasData: boolean;
}

interface MarketCardProps {
  id: number;
  name: string;
  outcomes?: Outcome[];
  status?: 'pending' | 'open' | 'closed' | 'resolved' | 'annulled';
  winning_outcome?: WinningOutcome | null;
}

export default function MarketCard({
  id,
  name,
  outcomes = [],
  status = 'open',
  winning_outcome = null
}: MarketCardProps) {
  const [marketVolume, setMarketVolume] = useState<number | null>(null);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<PriceChangeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine market resolution status
  const isResolved = status === 'resolved';
  const isAnnulled = status === 'annulled';
  const isOpen = status === 'open';

  // Calculate the current price (YES outcome probability)
  const getCurrentPrice = (): number => {
    const totalTokens = outcomes.reduce((sum, outcome) => sum + outcome.tokens, 0);
    const yesOutcome = outcomes.find(outcome => outcome.name.toLowerCase() === "yes");
    
    if (!yesOutcome || totalTokens === 0) return 0;
    return (yesOutcome.tokens / totalTokens) * 100;
  };

  // Fetch market data including 24h price change
  useEffect(() => {
    async function fetchMarketData() {
      try {
        // Fetch all predictions for volume and trade count
        const { data: allPredictions, error: predictionsError } = await supabase
          .from("predictions")
          .select("trade_value, trade_type, market_odds, created_at")
          .eq("market_id", id)
          .order("created_at", { ascending: false });

        if (predictionsError) {
          console.error("Error fetching market predictions:", predictionsError.message);
          setIsLoading(false);
          return;
        }

        const typedData = allPredictions as Prediction[];

        // Calculate volume and trade count
        const totalVolume = typedData.reduce(
          (sum: number, prediction: Prediction) => sum + Math.abs(prediction.trade_value),
          0
        );
        setMarketVolume(totalVolume);
        setTradeCount(typedData.length);

        // Calculate 24-hour price change (only for open markets)
        if (isOpen) {
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          
          const currentPrice = getCurrentPrice();
          
          // Find the most recent prediction from 24+ hours ago
          const oldPredictions = typedData.filter(pred => 
            new Date(pred.created_at) <= twentyFourHoursAgo
          );

          if (oldPredictions.length > 0 && currentPrice > 0) {
            // Get the most recent prediction from 24h ago (first in the filtered array since we ordered by created_at desc)
            const oldestRecentPrediction = oldPredictions[0];
            const previousPrice = oldestRecentPrediction.market_odds * 100;
            
            const changeAmount = currentPrice - previousPrice;
            const changePercentage = previousPrice > 0 ? (changeAmount / previousPrice) * 100 : 0;
            
            setPriceChange({
              currentPrice,
              previousPrice,
              changeAmount,
              changePercentage,
              hasData: true
            });
          } else {
            // No data from 24h ago, but we still want to show current price
            setPriceChange({
              currentPrice,
              previousPrice: currentPrice,
              changeAmount: 0,
              changePercentage: 0,
              hasData: false
            });
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch market data:", err);
        setIsLoading(false);
      }
    }

    // Only fetch if we have outcomes data
    if (outcomes.length > 0) {
      fetchMarketData();
    } else {
      setIsLoading(false);
    }
  }, [id, outcomes, isOpen]);

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Format price change display
  const formatPriceChange = (change: PriceChangeData) => {
    const sign = change.changeAmount >= 0 ? '+' : '';
    return `${sign}${change.changeAmount.toFixed(1)}%`;
  };

  // Get price change color - updated to include gray for no change
  const getPriceChangeColor = (changeAmount: number) => {
    if (changeAmount > 0) return 'text-green-500';
    if (changeAmount < 0) return 'text-red-500';
    return 'text-gray-500'; // Gray for no change (changeAmount === 0)
  };

  // Get market status badge
  const getStatusBadge = () => {
    if (isResolved) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
          Resolved
        </div>
      );
    } else if (isAnnulled) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
          Annulled
        </div>
      );
    } else if (status === 'closed') {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-200">
          Closed
        </div>
      );
    } else if (status === 'pending') {
      // This should never be reached due to early return, but included for completeness
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
          Pending
        </div>
      );
    }
    return null;
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

  // IMPORTANT: Don't render pending markets
  // This check is after all hooks to comply with Rules of Hooks
  if (status === 'pending') {
    return null;
  }

  return (
    <Link href={`/markets/${id}`} className="w-full max-w-sm group">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-lg shadow-black/20 hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer w-full overflow-hidden h-full">
        <div className="p-5">
          {/* Header with title and status */}
          <div className="flex justify-between items-start mb-4 gap-2">
            <h2 className="text-base font-semibold leading-snug text-white flex-1 group-hover:text-indigo-200 transition-colors line-clamp-3">{name}</h2>
            {getStatusBadge()}
          </div>
          
          {/* Market Resolution Display */}
          {isResolved && winning_outcome ? (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-green-300 mb-1">Resolved</div>
                <div className="text-lg font-bold text-green-200">
                  {winning_outcome.name} Won
                </div>
              </div>
            </div>
          ) : isAnnulled ? (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-yellow-300 mb-1">Market Annulled</div>
                <div className="text-lg font-bold text-yellow-200">
                  Settled at 50¢
                </div>
                <div className="text-xs text-yellow-300 mt-1">
                  All shares redeemed at initial odds
                </div>
              </div>
            </div>
          ) : isResolved ? (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-blue-300 mb-1">Resolved</div>
                <div className="text-lg font-bold text-blue-200">
                  Market Settled
                </div>
              </div>
            </div>
          ) : (
            /* Outcome tiles + probability bar for open markets */
            sortedOutcomes.length > 0 && (
              <div className="mb-4">
                {/* Probability split bar */}
                {(() => {
                  const yesOdds = totalTokens
                    ? ((sortedOutcomes[0]?.tokens ?? 0) / totalTokens) * 100
                    : 50;
                  return (
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] mb-3">
                      <div className="bg-green-500/80" style={{ width: `${yesOdds}%` }} />
                      <div className="bg-rose-500/70" style={{ width: `${100 - yesOdds}%` }} />
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2.5">
                  {sortedOutcomes.slice(0, 2).map((outcome, index) => {
                    // Calculate odds only if totalTokens > 0 to avoid division by zero
                    const odds = totalTokens ? (outcome.tokens / totalTokens) * 100 : 0;
                    const isYes = outcome.name.toLowerCase() === "yes";
                    const tone = isYes
                      ? "bg-green-500/10 border-green-500/25 text-green-400"
                      : "bg-rose-500/10 border-rose-500/25 text-rose-400";

                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-center justify-center rounded-xl border py-3 ${tone}`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{outcome.name}</div>
                        <div className="text-2xl font-bold tabular-nums">{odds.toFixed(0)}%</div>
                        <div className="text-[11px] text-[var(--muted)]">$100 → ${(odds).toFixed(0)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Footer: volume · trades · 24h change */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
            <div className="flex items-center gap-4 text-[var(--muted)]">
              <span>
                <span className="text-gray-300 font-medium">
                  {isLoading ? "—" : marketVolume !== null ? formatCurrency(marketVolume) : "$0"}
                </span>{" "}
                Vol
              </span>
              <span>
                <span className="text-gray-300 font-medium">{isLoading ? "—" : tradeCount}</span>{" "}
                Trades
              </span>
            </div>
            {isOpen && priceChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--muted-2)]">24h</span>
                {priceChange.hasData ? (
                  <span className={`font-semibold ${getPriceChangeColor(priceChange.changeAmount)}`}>
                    {formatPriceChange(priceChange)}
                  </span>
                ) : (
                  <span className="text-[var(--muted-2)]">—</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}