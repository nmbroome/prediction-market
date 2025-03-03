"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import { addPrediction } from "@/lib/predictions";
import { constantProductMarketMaker } from "@/lib/marketMakers";

interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
}

interface Answer {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
}

export default function MarketDetails() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [amountIn, setAmountIn] = useState<number>(10);
  const [computedReturn, setComputedReturn] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch logged-in user.
  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw new Error(error.message);
      setUser(user);
    } catch (e) {
      setError(`Error fetching user: ${e}`);
    }
  };

  // Fetch market data (both market details and outcomes).
  const fetchMarketData = useCallback(async () => {
    if (!id) return;

    try {
      const { data: marketData, error: marketError } = await supabase
        .from("markets")
        .select("id, name, description, token_pool, market_maker")
        .eq("id", id)
        .single();

      if (marketError) throw new Error(marketError.message);
      setMarket(marketData as Market);

      const { data: answersData, error: answersError } = await supabase
        .from("outcomes")
        .select("id, name, tokens, market_id")
        .eq("market_id", id);

      if (answersError) throw new Error(answersError.message);
      setAnswers(answersData as Answer[]);
    } catch (e) {
      setError(`Error fetching market data: ${e}`);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
    fetchMarketData();
  }, [fetchMarketData]);

  // Re-calculate the return amount whenever the selected answer or amount changes.
  useEffect(() => {
    if (selectedAnswer && amountIn > 0) {
      const reserveA = selectedAnswer.tokens;
      const otherAnswers = answers.filter((a) => a.id !== selectedAnswer.id);
      const reserveB = otherAnswers.reduce((sum, a) => sum + a.tokens, 0);

      // Ensure liquidity is sufficient.
      if (reserveA > 0 && reserveB > 0) {
        // Calculate market odds and cost per share.
        const marketOdds = reserveB / (reserveA + reserveB);
        const cost = marketOdds * amountIn;

        // Use cost as the predict_amt in the market maker function.
        const returnAmt = constantProductMarketMaker(reserveA, reserveB, cost);
        setComputedReturn(returnAmt);
      } else {
        setComputedReturn(0);
      }
    } else {
      setComputedReturn(0);
    }
  }, [selectedAnswer, amountIn, answers]);

  // Handle prediction submission.
  const handlePrediction = async (selectedAnswer: Answer) => {
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("User is not logged in.");
      return;
    }

    if (!market) {
      setError("Market data is not available.");
      return;
    }

    if (amountIn <= 0) {
      setError("Please enter a prediction amount greater than 0.");
      return;
    }

    try {
      // Get token reserves.
      const reserveA = selectedAnswer.tokens;
      const otherAnswers = answers.filter((a) => a.id !== selectedAnswer.id);
      const reserveB = otherAnswers.reduce((sum, a) => sum + a.tokens, 0);

      if (reserveA <= 0 || reserveB <= 0) {
        throw new Error("Market liquidity is insufficient.");
      }

      // Calculate market odds and cost.
      const marketOdds = reserveB / (reserveA + reserveB);
      const cost = marketOdds * amountIn;

      // Optionally, check if the user has enough tokens in their balance here.
      // For example: if(userTokenBalance < cost) { ... }

      // Calculate return amount using the cost.
      const returnAmount = constantProductMarketMaker(reserveA, reserveB, cost);
      if (returnAmount <= 0) {
        throw new Error("Trade failed: Insufficient liquidity.");
      }

      // Insert prediction record with cost as the predict_amt.
      await addPrediction({
        user_id: user.id,
        market_id: market.id,
        outcome_id: selectedAnswer.id,
        predict_amt: cost, // now using cost instead of raw amountIn
        return_amt: returnAmount,
      });

      // Update the selected outcome's token pool by adding the cost.
      const { error: updateError } = await supabase
        .from("outcomes")
        .update({ tokens: reserveA + cost })
        .eq("id", selectedAnswer.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess(
        `Prediction successful! You spent ${cost.toFixed(
          2
        )} tokens to buy ${amountIn} shares.`
      );

      // Refresh market data after prediction.
      await fetchMarketData();

      // Optionally, reset the selected answer and amount.
      setSelectedAnswer(null);
      setAmountIn(10);
    } catch (e) {
      setError(`Error making prediction: ${e}`);
    }
  };

  if (!market) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{market.name}</h1>
      <p className="mt-2">{market.description}</p>
      <p className="mt-4">
        <strong>Token Pool:</strong> {market.token_pool}
      </p>
      <p className="mt-2">
        <strong>Market Maker:</strong> {market.market_maker}
      </p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Select an Outcome</h2>
        {answers.length > 0 ? (
          <div className="flex flex-row gap-2">
            {answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => setSelectedAnswer(answer)}
                className={`w-fit px-4 py-2 text-white rounded-lg shadow 
                  ${
                    selectedAnswer?.id === answer.id
                      ? "bg-green-600"
                      : "bg-blue-600 hover:bg-blue-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <span className="block text-lg font-medium">{answer.name}</span>
                <span className="block text-sm">
                  {market.token_pool
                    ? ((answer.tokens / market.token_pool) * 100).toFixed(2) + "%"
                    : "N/A"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2">No answers available for this market.</p>
        )}
      </div>

      {/* Prediction panel */}
      {selectedAnswer && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-xl font-semibold">
            Predict for: {selectedAnswer.name}
          </h2>
          <div className="mt-4">
            <label htmlFor="amountIn" className="block text-sm font-medium text-white">
              Number of Shares:
            </label>
            <input
              type="number"
              id="amountIn"
              value={amountIn}
              onChange={(e) => {
                const value = e.target.value;
                setAmountIn(value ? Number(value) : 0);
              }}
              min="1"
              className="mt-1 block w-fit px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
          </div>
          <div className="mt-4">
            <p>
              <strong>Potential Return:</strong> {computedReturn.toFixed(2)} tokens
            </p>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => handlePrediction(selectedAnswer)}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Prediction
            </button>
            <button
              onClick={() => setSelectedAnswer(null)}
              className="px-4 py-2 text-white bg-red-600 rounded-lg shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {success && <p className="mt-4 text-green-600">{success}</p>}
    </div>
  );
}
