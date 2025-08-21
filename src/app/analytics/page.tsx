// src/app/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import MarketStats from "@/components/analytics/MarketStats";
import MarketActivityCharts from "@/components/analytics/MarketActivityCharts";

interface Prediction {
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  trade_value: number;
  created_at: string;
}

interface Market {
  id: number;
  name: string;
  status: string;
  created_at: string;
  token_pool: number;
}

interface MarketStatsData {
  allTime: {
    markets: number;
    predictions: number;
    tradeVolume: number;
  };
  open: {
    markets: number;
    predictions: number;
    tradeVolume: number;
  };
}

interface MarketActivityData {
  date: string;
  predictions: number;
  markets_created: number;
  volume: number;
}

interface AnalyticsData {
  marketStats: MarketStatsData;
  marketActivityData: MarketActivityData[];
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all markets (excluding pending markets)
      const { data: marketsData, error: marketsError } = await supabase
        .from("markets")
        .select("id, name, status, created_at, token_pool")
        .neq("status", "pending");

      if (marketsError) throw new Error(`Failed to fetch markets: ${marketsError.message}`);

      const markets = marketsData as Market[];
      const totalMarkets = markets.length;
      const openMarkets = markets.filter(m => m.status === 'open');
      const openMarketsCount = openMarkets.length;

      // Fetch ALL predictions for market stats calculations
      const { data: allPredictionsData, error: allPredictionsError } = await supabase
        .from("predictions")
        .select("user_id, market_id, outcome_id, shares_amt, trade_value, created_at");

      if (allPredictionsError) throw new Error(`Failed to fetch all predictions: ${allPredictionsError.message}`);

      // Calculate market stats
      const allTimePredictions = allPredictionsData || [];
      const allTimeTradeVolume = allTimePredictions.reduce((sum, p) => sum + Math.abs(p.trade_value || 0), 0);

      // Filter predictions for open markets only
      const openMarketIds = new Set(openMarkets.map(m => m.id));
      const openMarketPredictions = allTimePredictions.filter(p => openMarketIds.has(p.market_id));
      const openMarketTradeVolume = openMarketPredictions.reduce((sum, p) => sum + Math.abs(p.trade_value || 0), 0);

      const marketStats: MarketStatsData = {
        allTime: {
          markets: totalMarkets,
          predictions: allTimePredictions.length,
          tradeVolume: allTimeTradeVolume
        },
        open: {
          markets: openMarketsCount,
          predictions: openMarketPredictions.length,
          tradeVolume: openMarketTradeVolume
        }
      };

      // Generate market activity data for charts
      const marketActivityData = generateMarketActivityData(allTimePredictions, markets);

      const analytics: AnalyticsData = {
        marketStats,
        marketActivityData
      };

      setAnalyticsData(analytics);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const generateMarketActivityData = (predictions: Prediction[], markets: Market[]): MarketActivityData[] => {
    const data: MarketActivityData[] = [];
    
    // Get date range for comprehensive data (last 2 years to cover all scenarios)
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 2, 0, 1); // Start from 2 years ago
    
    // Generate daily data points
    const current = new Date(startDate);
    
    while (current <= now) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

      // Filter predictions for this day
      const dayPredictions = predictions.filter(p => {
        const predDate = new Date(p.created_at);
        return predDate >= dayStart && predDate <= dayEnd;
      });

      // Filter markets created on this day
      const marketsCreated = markets.filter(m => {
        const marketDate = new Date(m.created_at);
        return marketDate >= dayStart && marketDate <= dayEnd;
      });

      const predictionCount = dayPredictions.length;
      const totalVolume = dayPredictions.reduce((sum, p) => sum + Math.abs(p.trade_value || 0), 0);
      const marketsCreatedCount = marketsCreated.length;

      data.push({
        date: current.toISOString().split('T')[0], // YYYY-MM-DD format for daily data
        predictions: predictionCount,
        markets_created: marketsCreatedCount,
        volume: totalVolume
      });

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto p-6">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto p-6">
          <p className="text-center text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Market Analytics</h1>
          <p className="text-gray-400">Prophet prediction market statistics and trends</p>
        </div>

        {/* Market Statistics Section */}
        <MarketStats
          data={analyticsData.marketStats}
          loading={false}
        />

        {/* Market Activity Charts */}
        <MarketActivityCharts
          data={analyticsData.marketActivityData}
          loading={false}
        />

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Market analytics updated in real-time</p>
        </div>
      </div>
    </div>
  );
}