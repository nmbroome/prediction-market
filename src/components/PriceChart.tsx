"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface PricePoint {
  timestamp: string;
  probability: number;
  shares_amt: number;
  trade_type: 'buy' | 'sell';
}

interface PriceChartProps {
  marketId?: number;
  outcomeId?: number;
  height?: number;
  width?: string | number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PricePoint;
  }>;
}

export default function PriceChart({
  marketId: propMarketId,
  outcomeId: propOutcomeId,
  height = 300,
  width = "100%"
}: PriceChartProps) {
  const params = useParams();
  const marketId = propMarketId || Number(params.id);
  
  const [outcomeId, setOutcomeId] = useState<number | null>(propOutcomeId || null);
  const [outcomes, setOutcomes] = useState<{ id: number; name: string }[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'all'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch outcomes for the market
  const fetchOutcomes = useCallback(async () => {
    if (!marketId) return;
    
    try {
      const { data, error } = await supabase
        .from("outcomes")
        .select("id, name")
        .eq("market_id", marketId);
        
      if (error) throw error;
      
      setOutcomes(data || []);
      
      // Select the first outcome by default if none is provided
      if (!propOutcomeId && data && data.length > 0) {
        setOutcomeId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching outcomes:", err);
      setError("Failed to load outcomes");
    }
  }, [marketId, propOutcomeId]);

  // Fetch price history for the selected outcome
  const fetchPriceHistory = useCallback(async () => {
    if (!marketId || !outcomeId) return;
    
    setLoading(true);
    try {
      // Get all predictions for this market and outcome to calculate historical prices
      const { data: predictions, error } = await supabase
        .from("predictions")
        .select(`
          id, 
          market_id,
          outcome_id, 
          market_odds,
          created_at,
          shares_amt,
          trade_type
        `)
        .eq("market_id", marketId)
        .eq("outcome_id", outcomeId)
        .order("created_at", { ascending: true });
        
      if (error) throw error;
      
      // Filter based on time range
      let filteredData = [...predictions];
      
      if (timeRange !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeRange) {
          case '1d':
            cutoffDate.setDate(now.getDate() - 1);
            break;
          case '7d':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            cutoffDate.setDate(now.getDate() - 30);
            break;
        }
        
        filteredData = predictions.filter(p => 
          new Date(p.created_at) >= cutoffDate
        );
      }
      
      // Transform the data for the chart
      const chartData: PricePoint[] = filteredData.map(p => ({
        timestamp: p.created_at,
        probability: Math.round(p.market_odds * 100), // Convert to percentage
        shares_amt: p.shares_amt,
        trade_type: p.trade_type
      }));
      
      setPriceHistory(chartData);
    } catch (err) {
      console.error("Error fetching price history:", err);
      setError("Failed to load price data");
    } finally {
      setLoading(false);
    }
  }, [marketId, outcomeId, timeRange]);

  // Initial data loading
  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  // Fetch price history when outcome or time range changes
  useEffect(() => {
    if (outcomeId) {
      fetchPriceHistory();
    }
  }, [outcomeId, fetchPriceHistory]);

  // Format date for display on chart
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Custom tooltip to show additional trade details
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-[#1E1E1E] border border-[#2C2C2C] rounded shadow-lg">
          <p className="text-gray-300">{new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-white font-semibold">Probability: {data.probability}%</p>
          <p className="text-gray-300">
            {data.trade_type === 'buy' ? 'Buy' : 'Sell'}: {data.shares_amt.toFixed(2)} shares
          </p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-[#1E1E1E] rounded border border-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full bg-[#1E1E1E] rounded-lg border border-[#2C2C2C] p-4">
      <div className="flex flex-col mb-4">
        <h3 className="text-white text-xl font-semibold mb-4">Price History</h3>
        
        <div className="flex justify-between items-center mb-4">
          {/* Outcome selector */}
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">Outcome:</span>
            <select
              value={outcomeId || ''}
              onChange={(e) => setOutcomeId(Number(e.target.value))}
              className="bg-[#2C2C2C] text-white border border-[#3C3C3C] rounded px-2 py-1"
            >
              {outcomes.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Time range selector */}
          <div className="flex space-x-2">
            {(['1d', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2C2C2C] text-gray-400 hover:bg-[#3C3C3C]'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center" style={{ height }}>
          <div className="animate-pulse text-blue-400 flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading price data...
          </div>
        </div>
      ) : priceHistory.length === 0 ? (
        <div className="flex justify-center items-center text-gray-400" style={{ height }}>
          No price data available for this outcome
        </div>
      ) : (
        <ResponsiveContainer width={width} height={height}>
          <LineChart
            data={priceHistory}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatDate}
              stroke="#666"
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {/* Reference line at 50% */}
            <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="probability"
              stroke="#3B82F6"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="Probability"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}