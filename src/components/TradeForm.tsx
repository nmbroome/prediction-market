"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import { addPrediction } from "@/lib/predictions";
import { constantProductMarketMaker } from "@/lib/marketMakers"; // import your market maker function
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
  tokens: number; // current token pool for this outcome
  market_id: number;
}

export default function TradeForm() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(10); // tokens the user will spend
  const [computedShares, setComputedShares] = useState<number>(0); // computed shares purchased
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
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`Error fetching market data: ${e.message}`);
      } else {
        setError("Error fetching market data.");
      }
    }
  }, [id]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Re-calculate the computed shares using the constantProductMarketMaker function.
  // This function assumes a binary market (exactly 2 outcomes).
  useEffect(() => {
    if (selectedAnswer && totalPrice > 0 && answers.length === 2) {
      const otherAnswer = answers.find((a) => a.id !== selectedAnswer.id);
      if (!otherAnswer) {
        setComputedShares(0);
        return;
      }
      try {
        // Use the provided function:
        // outcome1_tokens: selected outcome's token pool
        // outcome2_tokens: opposing outcome's token pool
        // predict_amt: amount being spent (totalPrice)
        const shares = constantProductMarketMaker(
          selectedAnswer.tokens,
          otherAnswer.tokens,
          totalPrice
        );
        setComputedShares(shares);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        }
        setComputedShares(0);
      }
    } else {
      setComputedShares(0);
    }
  }, [selectedAnswer, totalPrice, answers]);

  // Handle prediction submission using the constantProductMarketMaker function.
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
    if (answers.length !== 2) {
      setError("This market currently supports only binary outcomes.");
      return;
    }
    try {
      const otherAnswer = answers.find((a) => a.id !== selectedAnswer.id);
      if (!otherAnswer) {
        throw new Error("Could not determine the opposing outcome.");
      }
  
      // Determine new token pools
      const k = selectedAnswer.tokens * otherAnswer.tokens;
      const newOutcome1Tokens = selectedAnswer.tokens + totalPrice;
      const newOutcome2Tokens = k / newOutcome1Tokens;
      const sharesPurchased = constantProductMarketMaker(
        selectedAnswer.tokens,
        otherAnswer.tokens,
        totalPrice
      );
  
      // Insert the prediction record
      await addPrediction({
        user_id: user.id,
        market_id: market.id,
        outcome_id: selectedAnswer.id,
        predict_amt: sharesPurchased, // Number of shares purchased
        buy_price:
          selectedAnswer.tokens / (selectedAnswer.tokens + otherAnswer.tokens), // Current probability
        return_amt: sharesPurchased, // Assuming payout is 1 per share
      });
  
      // Update both outcomes in the database
      const { error: updateError1 } = await supabase
        .from("outcomes")
        .update({ tokens: newOutcome1Tokens })
        .eq("id", selectedAnswer.id);
      if (updateError1) throw new Error(updateError1.message);
  
      const { error: updateError2 } = await supabase
        .from("outcomes")
        .update({ tokens: newOutcome2Tokens })
        .eq("id", otherAnswer.id);
      if (updateError2) throw new Error(updateError2.message);
  
      // **Now update the market token pool**
      const newMarketTokenPool = newOutcome1Tokens + newOutcome2Tokens;
  
      const { error: marketUpdateError } = await supabase
        .from("markets")
        .update({ token_pool: newMarketTokenPool })
        .eq("id", market.id);
  
      if (marketUpdateError) {
        throw new Error(`Failed to update market token_pool: ${marketUpdateError.message}`);
      }
  
      setSuccess(
        `Prediction successful! You spent ${totalPrice.toFixed(2)} tokens to purchase ${sharesPurchased.toFixed(2)} shares.`
      );
  
      // Refresh market data
      await fetchMarketData();
  
      // Reset selection and total price
      setSelectedAnswer(null);
      setTotalPrice(10);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`Error making prediction: ${e.message}`);
      } else {
        setError("Error making prediction.");
      }
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
                    ? ((answer.tokens / totalOutcomeTokens) * 100).toFixed(2) +
                      "%"
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
            className="mt-1 block w-full px-3 py-2 border rounded-md text-black"
          />
          <div className="mt-4">
            <p>
              <strong>Shares To Be Purchased (CPMM):</strong>{" "}
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
