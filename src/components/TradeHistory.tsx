"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabase/createClient";

// Prediction interface (for trade history)
interface Prediction {
  id: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  predict_amt: number;
  return_amt: number;
  created_at: string;
}

interface TradeHistoryProps {
  userId: string;
}

export default function TradeHistory({ userId }: TradeHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }
        setPredictions(data as Prediction[]);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error fetching trade history.");
        }
      }
      setLoading(false);
    }
    fetchPredictions();
  }, [userId]);

  if (loading) return <div>Loading trade history...</div>;
  if (error) return <div>Error: {error}</div>;
  if (predictions.length === 0)
    return <div>No trade history available.</div>;

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Trade History</h3>
      <table className="min-w-full border-collapse text-white">
        <thead>
          <tr>
            <th className="border px-4 py-2">Market ID</th>
            <th className="border px-4 py-2">Outcome ID</th>
            <th className="border px-4 py-2">Prediction Amount</th>
            <th className="border px-4 py-2">Return Amount</th>
            <th className="border px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction) => (
            <tr key={prediction.id}>
              <td className="border px-4 py-2">
                <Link
                  href={`/markets/${prediction.market_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {prediction.market_id}
                </Link>
              </td>
              <td className="border px-4 py-2">{prediction.outcome_id}</td>
              <td className="border px-4 py-2">{prediction.predict_amt}</td>
              <td className="border px-4 py-2">{prediction.return_amt}</td>
              <td className="border px-4 py-2">
                {new Date(prediction.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
