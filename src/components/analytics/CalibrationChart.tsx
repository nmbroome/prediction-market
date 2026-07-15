// src/components/analytics/CalibrationChart.tsx
"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import supabase from "@/lib/supabase/createClient";

interface ResolvedMarketRow {
  id: number;
  outcome_id: number | null;
}

interface PredictionRow {
  market_id: number;
  outcome_id: number;
  market_odds: number;
}

interface CalibrationBucket {
  // Midpoint of the probability bucket (0–1), used as the x position
  probability: number;
  // Observed resolution rate for trades in this bucket (0–1)
  actual: number;
  // Number of trades that fell into this bucket
  count: number;
}

const NUM_BUCKETS = 10; // 10% wide buckets: [0,10), [10,20), ... [90,100]

/**
 * Platform calibration chart, in the spirit of Manifold's /calibration page.
 *
 * For every trade placed on a market that has since resolved, we take the
 * market probability at trade time (`market_odds` for the traded outcome) and
 * check whether that outcome ultimately won. Trades are bucketed by probability;
 * within each bucket we plot the fraction that resolved YES against the bucket's
 * probability. A perfectly calibrated market sits on the y = x diagonal:
 * things it prices at 70% happen 70% of the time.
 */
const CalibrationChart = memo(() => {
  const [buckets, setBuckets] = useState<CalibrationBucket[]>([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [brier, setBrier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCalibration = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Resolved markets with a recorded winning outcome.
        const { data: marketsData, error: marketsError } = await supabase
          .from("markets")
          .select("id, outcome_id")
          .eq("status", "resolved")
          .not("outcome_id", "is", null);

        if (marketsError) throw new Error(marketsError.message);

        const markets = (marketsData as ResolvedMarketRow[]) || [];
        const winningOutcomeByMarket = new Map<number, number>();
        markets.forEach((m) => {
          if (m.outcome_id != null) winningOutcomeByMarket.set(m.id, m.outcome_id);
        });

        if (winningOutcomeByMarket.size === 0) {
          if (!cancelled) {
            setBuckets([]);
            setTotalTrades(0);
            setBrier(null);
          }
          return;
        }

        // 2. Every trade placed on those markets. Supabase caps a single
        // select at 1000 rows, so page through with .range() until exhausted —
        // otherwise calibration silently drops trades once volume exceeds 1000.
        const marketIds = Array.from(winningOutcomeByMarket.keys());
        const PAGE_SIZE = 1000;
        const predictions: PredictionRow[] = [];
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data: page, error: predictionsError } = await supabase
            .from("predictions")
            .select("market_id, outcome_id, market_odds")
            .in("market_id", marketIds)
            .range(from, from + PAGE_SIZE - 1);

          if (predictionsError) throw new Error(predictionsError.message);

          const batch = (page as PredictionRow[]) || [];
          predictions.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }

        // 3. Bucket trades by probability and tally resolution outcomes.
        const bucketCounts = new Array(NUM_BUCKETS).fill(0);
        const bucketWins = new Array(NUM_BUCKETS).fill(0);
        let count = 0;
        let brierSum = 0;

        predictions.forEach((p) => {
          const winningOutcome = winningOutcomeByMarket.get(p.market_id);
          if (winningOutcome == null) return;
          if (p.market_odds == null || Number.isNaN(p.market_odds)) return;

          const prob = Math.min(1, Math.max(0, p.market_odds));
          const won = p.outcome_id === winningOutcome ? 1 : 0;

          const idx = Math.min(NUM_BUCKETS - 1, Math.floor(prob * NUM_BUCKETS));
          bucketCounts[idx] += 1;
          bucketWins[idx] += won;

          brierSum += (prob - won) ** 2;
          count += 1;
        });

        const computed: CalibrationBucket[] = [];
        for (let i = 0; i < NUM_BUCKETS; i++) {
          if (bucketCounts[i] === 0) continue;
          computed.push({
            probability: (i + 0.5) / NUM_BUCKETS,
            actual: bucketWins[i] / bucketCounts[i],
            count: bucketCounts[i],
          });
        }

        if (!cancelled) {
          setBuckets(computed);
          setTotalTrades(count);
          setBrier(count > 0 ? brierSum / count : null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load calibration data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCalibration();
    return () => {
      cancelled = true;
    };
  }, []);

  const percentTick = useMemo(
    () => (value: number) => `${Math.round(value * 100)}%`,
    []
  );

  if (loading) {
    return (
      <div className="bg-[var(--background)] rounded-lg p-6 border border-[var(--border)] mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Platform Calibration</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--background)] rounded-lg p-6 border border-[var(--border)] mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Platform Calibration</h3>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] rounded-lg p-6 border border-[var(--border)] mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Platform Calibration</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Market probability at trade time vs. how often that outcome actually
            resolved YES, across all resolved markets. Points on the dashed
            diagonal mean the platform is perfectly calibrated.
          </p>
        </div>
        {brier != null && (
          <div className="bg-[var(--surface)] rounded-lg px-4 py-2 border border-[var(--border)] text-center shrink-0">
            <div className="text-gray-400 text-xs">Brier score</div>
            <div className="text-2xl font-bold text-blue-400">{brier.toFixed(3)}</div>
            <div className="text-gray-500 text-xs">lower is better</div>
          </div>
        )}
      </div>

      {buckets.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-gray-400 text-center">
          No resolved markets with trades yet. Calibration appears once markets
          resolve.
        </div>
      ) : (
        <>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  dataKey="probability"
                  name="Market probability"
                  domain={[0, 1]}
                  ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                  tickFormatter={percentTick}
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{
                    value: "Market probability",
                    position: "insideBottom",
                    offset: -15,
                    fill: "#9CA3AF",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="actual"
                  name="Resolved YES"
                  domain={[0, 1]}
                  ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                  tickFormatter={percentTick}
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{
                    value: "Resolved YES",
                    angle: -90,
                    position: "insideLeft",
                    offset: 20,
                    fill: "#9CA3AF",
                    fontSize: 12,
                  }}
                />
                <ZAxis type="number" dataKey="count" range={[64, 64]} name="Trades" />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                  ]}
                  stroke="#6B7280"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#4B5563" }}
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB",
                  }}
                  formatter={(value: number | string, name: string) => {
                    if (name === "Trades") return [value, "Trades"];
                    return [`${(Number(value) * 100).toFixed(1)}%`, name];
                  }}
                />
                <Scatter
                  name="Calibration"
                  data={buckets}
                  fill="#3B82F6"
                  line={{ stroke: "#3B82F6", strokeWidth: 2 }}
                  lineType="joint"
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)] text-sm text-gray-400 text-center">
            Based on{" "}
            <span className="text-blue-400 font-medium">
              {new Intl.NumberFormat("en-US").format(totalTrades)}
            </span>{" "}
            trades across resolved markets. Hover a point for its trade count.
          </div>
        </>
      )}
    </div>
  );
});

CalibrationChart.displayName = "CalibrationChart";

export default CalibrationChart;
