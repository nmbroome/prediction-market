"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import { addPrediction } from "@/lib/predictions";
import { constantProductMarketMaker } from "@/lib/marketMakers";
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
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [computedShares, setComputedShares] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');

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
  
  const handleSell = async () => {
    setError(null);
    setSuccess(null);
    if (!user || !market || !selectedAnswer) {
      return setError("Missing user, market, or outcome.");
    }
    const sellShares = totalPrice;
    // Fetch user's current position in this outcome
    const { data: preds, error: fetchError } = await supabase
    .from("predictions")
    .select("predict_amt")
    .eq("user_id", user.id)
    .eq("outcome_id", selectedAnswer.id);
  
    if (fetchError) return setError(fetchError.message);
    const owned = preds?.reduce((total, p) => total + (p.predict_amt ?? 0), 0) ?? 0;
  
    if (sellShares > owned) return setError("Not enough shares to sell.");
  
    // Compute current price
    const price =
      selectedAnswer.tokens /
      answers.reduce((acc, a) => acc + a.tokens, 0);
  
    // Compute token changes via constant‑product: 
    // we remove liquidity → newTokens = oldTokens - price * sellShares
    const other = answers.find((a) => a.id !== selectedAnswer.id)!;
    const newSelectedTokens = selectedAnswer.tokens - price * sellShares;
    const k = selectedAnswer.tokens * other.tokens;
    const newOtherTokens = k / newSelectedTokens;
  
    await addPrediction({
      user_id: user.id,
      market_id: market.id,
      outcome_id: selectedAnswer.id,
      predict_amt: -sellShares,
      buy_price: price,
      return_amt: sellShares,
    });
  
    await supabase
      .from("outcomes")
      .update({ tokens: newSelectedTokens })
      .eq("id", selectedAnswer.id);
    await supabase
      .from("outcomes")
      .update({ tokens: newOtherTokens })
      .eq("id", other.id);
    await supabase
      .from("markets")
      .update({ token_pool: newSelectedTokens + newOtherTokens })
      .eq("id", market.id);
  
    setSuccess(`Sold ${sellShares.toFixed(2)} shares at ${price.toFixed(3)}`);
    await fetchMarketData();
    setSelectedAnswer(null);
    setTotalPrice(10);
  };
  

  // Compute total tokens across all outcomes for display.
  const totalOutcomeTokens = answers.reduce((sum, a) => sum + a.tokens, 0);

  // Calculate market probability for each outcome
  const getOutcomeProbability = (answer: Answer) => {
    return totalOutcomeTokens > 0
      ? ((answer.tokens / totalOutcomeTokens) * 100).toFixed(0)
      : '0';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-2xl shadow-lg border border-[#2C2C2C] p-6">
        {/* Market Title */}
        <div className="mb-6">
          <h2 className="text-white text-xl font-semibold">
            {market?.name || "Will Trump and Zelenskyy meet..."}
          </h2>
        </div>

        {/* Trade Type Selector */}
        <div className="flex mb-6">
          <button
            onClick={() => setTradeType('Buy')}
            className={`w-1/2 py-2 ${
              tradeType === 'Buy' 
                ? 'bg-blue-600 text-white' 
                : 'bg-[#2C2C2C] text-gray-400'
            } rounded-l-lg transition-colors`}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeType('Sell')}
            className={`w-1/2 py-2 ${
              tradeType === 'Sell' 
                ? 'bg-blue-600 text-white' 
                : 'bg-[#2C2C2C] text-gray-400'
            } rounded-r-lg transition-colors`}
          >
            Sell
          </button>
        </div>

        {/* Outcome Buttons */}
        <div className="flex gap-4 mb-6">
          {answers.length > 0 ? (
            answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => setSelectedAnswer(answer)}
                className={`flex-1 py-3 rounded-lg transition-colors ${
                  selectedAnswer?.id === answer.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2C2C2C] text-gray-400 hover:bg-[#3C3C3C]'
                }`}
              >
                <div className="flex justify-between px-4">
                  <span>{answer.name}</span>
                  <span>{getOutcomeProbability(answer)}¢</span>
                </div>
              </button>
            ))
          ) : (
            <>
              <button className="flex-1 py-3 bg-[#2C2C2C] text-gray-400 rounded-lg">
                <div className="flex justify-between px-4">
                  <span>Yes</span>
                  <span>13¢</span>
                </div>
              </button>
              <button className="flex-1 py-3 bg-[#2C2C2C] text-gray-400 rounded-lg">
                <div className="flex justify-between px-4">
                  <span>No</span>
                  <span>92¢</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(Number(e.target.value))}
              className="w-full bg-[#2C2C2C] text-white py-3 pl-6 pr-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="0"
            />
          </div>
        </div>

        {/* Trade Details */}
        <div className="bg-[#2C2C2C] rounded-lg p-4 mb-6 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Contracts</span>
            <span className="text-white">{computedShares.toFixed(0)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Average price</span>
            <span className="text-white">
              {selectedAnswer 
                ? (selectedAnswer.tokens / totalOutcomeTokens * 100).toFixed(1) + '¢'
                : '0¢'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Payout if {selectedAnswer?.name || 'outcome'} wins</span>
            <span className="text-white">$0</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={tradeType === 'Buy' ? handlePrediction : handleSell}
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={!selectedAnswer || totalPrice <= 0}
        >
          {tradeType === 'Buy' ? 'Buy' : 'Sell'} {selectedAnswer?.name || 'Outcome'}
        </button>

        {/* Error/Success Messages */}
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        {success && <p className="mt-4 text-green-500 text-center">{success}</p>}
      </div>
    </div>
  );
}