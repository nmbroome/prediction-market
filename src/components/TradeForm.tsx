"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import { addPrediction } from "@/lib/predictions";
import { User } from "@supabase/supabase-js";

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

export default function TradeForm() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(10); // total tokens user will spend
  const [computedShares, setComputedShares] = useState<number>(0); // number of shares computed from totalPrice
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch logged-in user.
  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setError(`Error fetching user: ${error.message}`);
      } else {
        setUser(user);
      }
    }
    fetchUser();
  }, []);

  // Fetch market details and outcomes.
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
    } catch (e: any) {
      setError(`Error fetching market data: ${e.message}`);
    }
  }, [id]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Re-calculate the number of shares purchased when selected outcome or total price changes.
  useEffect(() => {
    if (selectedAnswer && totalPrice > 0 && answers.length > 0) {
      // Calculate the total tokens across all outcomes.
      const totalOutcomeTokens = answers.reduce((sum, a) => sum + a.tokens, 0);
      if (totalOutcomeTokens > 0) {
        // Price per share is the chance for the selected outcome.
        const pricePerShare = selectedAnswer.tokens / totalOutcomeTokens;
        // Number of shares purchased = totalPrice divided by price per share.
        const sharesPurchased = pricePerShare > 0 ? totalPrice / pricePerShare : 0;
        setComputedShares(sharesPurchased);
      } else {
        setComputedShares(0);
      }
    } else {
      setComputedShares(0);
    }
  }, [selectedAnswer, totalPrice, answers]);

  // Handle prediction submission.
  const handlePrediction = async () => {
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
    if (!selectedAnswer) {
      setError("Please select an outcome.");
      return;
    }
    if (totalPrice <= 0) {
      setError("Please enter a total price greater than 0.");
      return;
    }
    try {
      const totalOutcomeTokens = answers.reduce((sum, a) => sum + a.tokens, 0);
      if (totalOutcomeTokens <= 0) {
        throw new Error("Market liquidity is insufficient.");
      }
      // Price per share for the selected outcome.
      const pricePerShare = selectedAnswer.tokens / totalOutcomeTokens;
      const sharesPurchased = pricePerShare > 0 ? totalPrice / pricePerShare : 0;
      // For a winning prediction, each share might pay out 1 token.
      // Set potential return equal to sharesPurchased (this can be adjusted as needed).
      const returnAmount = sharesPurchased;

      // Insert the prediction record.
      await addPrediction({
        user_id: user.id,
        market_id: market.id,
        outcome_id: selectedAnswer.id,
        predict_amt: sharesPurchased, // number of shares purchased.
        buy_price: pricePerShare, // price per share (i.e. the % chance for that outcome).
        return_amt: returnAmount,
      });

      // Update the selected outcome's token pool by adding the total price.
      const { error: updateError } = await supabase
        .from("outcomes")
        .update({ tokens: selectedAnswer.tokens + totalPrice })
        .eq("id", selectedAnswer.id);
      if (updateError) throw new Error(updateError.message);

      setSuccess(
        `Prediction successful! You spent ${totalPrice.toFixed(
          2
        )} tokens to purchase ${sharesPurchased.toFixed(
          2
        )} shares at a price of ${pricePerShare.toFixed(2)}.`
      );
      // Refresh market data.
      await fetchMarketData();
      // Reset selection and total price.
      setSelectedAnswer(null);
      setTotalPrice(10);
    } catch (e: any) {
      setError(`Error making prediction: ${e.message}`);
    }
  };

  // Compute total tokens across all outcomes for display.
  const totalOutcomeTokens = answers.reduce((sum, a) => sum + a.tokens, 0);

  return (
    <div className="p-6 border rounded mt-6">
      <h2 className="text-xl font-semibold">Trade Your Prediction</h2>
      <div className="mt-4">
        <h3 className="text-lg font-medium">Select an Outcome</h3>
        {answers.length > 0 ? (
          <div className="flex flex-row gap-2 mt-2">
            {answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => setSelectedAnswer(answer)}
                className={`w-fit px-4 py-2 text-white rounded-lg shadow ${
                  selectedAnswer?.id === answer.id
                    ? "bg-green-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <span className="block text-lg font-medium">{answer.name}</span>
                <span className="block text-sm">
                  {totalOutcomeTokens > 0
                    ? ((answer.tokens / totalOutcomeTokens) * 100).toFixed(2) + "%"
                    : "N/A"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p>No outcomes available.</p>
        )}
      </div>
      {selectedAnswer && (
        <div className="mt-6">
          <label htmlFor="totalPrice" className="block text-sm font-medium">
            Total Price:
          </label>
          <input
            type="number"
            id="totalPrice"
            value={totalPrice}
            onChange={(e) =>
              setTotalPrice(e.target.value ? Number(e.target.value) : 0)
            }
            min="1"
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
          <div className="mt-4">
            <p>
              <strong>Potential Shares Purchased:</strong>{" "}
              {computedShares.toFixed(2)} shares
            </p>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={handlePrediction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              Submit Prediction
            </button>
            <button
              onClick={() => setSelectedAnswer(null)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
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
