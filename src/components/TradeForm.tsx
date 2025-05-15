"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabase/createClient";
import { addPrediction } from "@/lib/predictions";
import { fixedPriceMarketMaker, cpmm_update } from "@/lib/marketMakers";
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
  
  // State variables
  const [market, setMarket] = useState<Market | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(10);
  const [computedShares, setComputedShares] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  
  // Loading states
  const [isUserLoading, setIsUserLoading] = useState<boolean>(true);
  const [isMarketLoading, setIsMarketLoading] = useState<boolean>(true);
  const [isSharesLoading, setIsSharesLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State to track user's share balances
  const [userShares, setUserShares] = useState<{[outcomeId: number]: number}>({});

  // Fetch logged-in user.
  useEffect(() => {
    async function fetchUser() {
      setIsUserLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        setError(`Error fetching user: ${error.message}`);
      } else {
        setUser(user);
      }
      setIsUserLoading(false);
    }
    fetchUser();
  }, []);

  // Fetch market details and outcomes.
  const fetchMarketData = useCallback(async () => {
    if (!id) return;
    setIsMarketLoading(true);
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
    } finally {
      setIsMarketLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);
  
  // Fetch user's shares whenever user or market changes
  useEffect(() => {
    async function fetchUserShares() {
      if (!user || !market) return;
      
      setIsSharesLoading(true);
      try {
        // Get all user's predictions for this market
        const { data, error } = await supabase
          .from("predictions")
          .select("outcome_id, shares_amt, trade_type")
          .eq("user_id", user.id)
          .eq("market_id", market.id);
          
        if (error) throw error;
        
        // Calculate share balance for each outcome
        const shares: {[outcomeId: number]: number} = {};
        
        // Initialize with zero for all answers
        answers.forEach(answer => {
          shares[answer.id] = 0;
        });
        
        // Sum up shares for each outcome, accounting for buys and sells
        data?.forEach(pred => {
          const outcomeId = pred.outcome_id;
          const amount = pred.shares_amt || 0;
          // Increment if buying, decrement if selling
          if (pred.trade_type === 'buy') {
            shares[outcomeId] = (shares[outcomeId] || 0) + amount;
          } else if (pred.trade_type === 'sell') {
            shares[outcomeId] = (shares[outcomeId] || 0) - amount;
          }
        });
        
        setUserShares(shares);
      } catch (e) {
        console.error("Error fetching user shares:", e);
      } finally {
        setIsSharesLoading(false);
      }
    }
    
    fetchUserShares();
  }, [user, market, answers]);

  // Calculate shares based on the trade type
  useEffect(() => {
    if (selectedAnswer && totalPrice > 0 && answers.length === 2) {
      const otherAnswer = answers.find((a) => a.id !== selectedAnswer.id);
      if (!otherAnswer) {
        setComputedShares(0);
        return;
      }
      try {
        // For buy - use fixed price market maker
        if (tradeType === 'buy') {
          const shares = fixedPriceMarketMaker(
            selectedAnswer.tokens,
            otherAnswer.tokens,
            totalPrice
          );
          setComputedShares(shares);
        } else {
          // For sell - the shares are directly the input amount
          // and we calculate the received amount in UI
          setComputedShares(totalPrice);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        }
        setComputedShares(0);
      }
    } else {
      setComputedShares(0);
    }
  }, [selectedAnswer, totalPrice, answers, tradeType]);

  // Format a number to a fixed number of decimal places (for display and comparison)
  const formatShares = (value: number, decimals: number = 2): number => {
    return parseFloat(value.toFixed(decimals));
  };
  
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };

  // Handle buy prediction
  const handleBuy = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
  
    if (!user) {
      setError("User is not logged in.");
      setIsSubmitting(false);
      return;
    }
    if (!market) {
      setError("Market data is not available.");
      setIsSubmitting(false);
      return;
    }
    if (!selectedAnswer) {
      setError("Please select an outcome.");
      setIsSubmitting(false);
      return;
    }
    if (totalPrice <= 0) {
      setError("Please enter a total price greater than 0.");
      setIsSubmitting(false);
      return;
    }
    if (answers.length !== 2) {
      setError("This market currently supports only binary outcomes.");
      setIsSubmitting(false);
      return;
    }
    try {
      const otherAnswer = answers.find((a) => a.id !== selectedAnswer.id);
      if (!otherAnswer) {
        throw new Error("Could not determine the opposing outcome.");
      }
  
      // Step 1: Calculate shares using fixed price model (for user experience)
      // Calculate current market odds
      const totalTokens = selectedAnswer.tokens + otherAnswer.tokens;
      const currentOdds = selectedAnswer.tokens / totalTokens;
      
      // Use fixed price to calculate shares - this gives the expected amount
      // where $10 at 50% odds gives 20 shares
      const sharesPurchased = fixedPriceMarketMaker(
        selectedAnswer.tokens,
        otherAnswer.tokens,
        totalPrice
      );
  
      // Step 2: Update the market state using CPMM (for price discovery)
      // This updates the odds based on the constant product formula
      const [newOutcome1Tokens, newOutcome2Tokens] = cpmm_update(
        selectedAnswer.tokens,
        otherAnswer.tokens,
        totalPrice
      );
  
      // Create prediction with new schema
      await addPrediction({
        user_id: user.id,
        market_id: market.id,
        outcome_id: selectedAnswer.id,
        shares_amt: sharesPurchased,
        market_odds: currentOdds,
        trade_value: -totalPrice, // Negative for buys (money going out)
        trade_type: 'buy'
      });
  
      // Update both outcomes in the database using the CPMM-calculated token amounts
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
  
      // Update the market token pool
      const newMarketTokenPool = newOutcome1Tokens + newOutcome2Tokens;
  
      const { error: marketUpdateError } = await supabase
        .from("markets")
        .update({ token_pool: newMarketTokenPool })
        .eq("id", market.id);
  
      if (marketUpdateError) {
        throw new Error(`Failed to update market token_pool: ${marketUpdateError.message}`);
      }
  
      setSuccess(
        `Purchase successful! You spent $${totalPrice.toFixed(2)} to purchase ${sharesPurchased.toFixed(2)} shares.`
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
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle sell functionality
  const handleSell = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    if (!user || !market || !selectedAnswer) {
      setError("Missing user, market, or outcome.");
      setIsSubmitting(false);
      return;
    }
    const sellShares = totalPrice; // For selling, this is the number of shares to sell
    
    // Check if user has enough shares to sell
    // Using the same formatting function as display to ensure consistency
    const owned = userShares[selectedAnswer.id] || 0;
    const formattedOwned = formatShares(owned);
    const formattedSellShares = formatShares(sellShares);
    
    if (formattedSellShares > formattedOwned) {
      setError(`Not enough shares to sell. You own ${formattedOwned.toFixed(2)} shares of ${selectedAnswer.name}.`);
      setIsSubmitting(false);
      return;
    }
    
    // Only allow selling shares if the user has a positive balance
    if (formattedOwned <= 0) {
      setError(`You don't own any shares of ${selectedAnswer.name} to sell.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const otherAnswer = answers.find((a) => a.id !== selectedAnswer.id);
      if (!otherAnswer) {
        setError("Could not determine the opposing outcome.");
        setIsSubmitting(false);
        return;
      }
      
      // Calculate current market odds
      const totalTokens = selectedAnswer.tokens + otherAnswer.tokens;
      const currentOdds = selectedAnswer.tokens / totalTokens;
      
      // For selling, calculate the amount received using the fixed price
      // When selling shares, we multiply by the current probability
      // This is the inverse of the buy calculation
      const receivedAmount = sellShares * currentOdds;
      
      // Update token pools using CPMM
      // For selling, we remove tokens from the selected outcome's pool
      const [new_other_tokens, new_selected_tokens] = cpmm_update(
        otherAnswer.tokens,     // In CPMM update, the first pool is where we add tokens
        selectedAnswer.tokens,  // The second pool is where tokens are removed
        receivedAmount          // Amount being added to first pool
      );
      
      // Record the sell transaction with new schema
      await addPrediction({
        user_id: user.id,
        market_id: market.id,
        outcome_id: selectedAnswer.id,
        shares_amt: sellShares,
        market_odds: currentOdds,
        trade_value: receivedAmount, // Positive for sells (money coming in)
        trade_type: 'sell'
      });
    
      // Update outcome tokens in the database
      const { error: updateError1 } = await supabase
        .from("outcomes")
        .update({ tokens: new_selected_tokens })
        .eq("id", selectedAnswer.id);
      
      if (updateError1) throw new Error(`Failed to update outcome tokens: ${updateError1.message}`);
      
      const { error: updateError2 } = await supabase
        .from("outcomes")
        .update({ tokens: new_other_tokens })
        .eq("id", otherAnswer.id);
        
      if (updateError2) throw new Error(`Failed to update opposing outcome tokens: ${updateError2.message}`);
      
      // Update market token pool
      const newMarketTokenPool = new_selected_tokens + new_other_tokens;
      const { error: marketUpdateError } = await supabase
        .from("markets")
        .update({ token_pool: newMarketTokenPool })
        .eq("id", market.id);
      
      if (marketUpdateError) {
        throw new Error(`Failed to update market token_pool: ${marketUpdateError.message}`);
      }
    
      setSuccess(`Successfully sold ${formatShares(sellShares).toFixed(2)} shares of ${selectedAnswer.name} and received ${formatCurrency(receivedAmount)}`);
      
      // Refresh market data to update UI with new odds
      await fetchMarketData();
      
      // Reset form
      setSelectedAnswer(null);
      setTotalPrice(10);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(`Error selling shares: ${e.message}`);
      } else {
        setError("An unexpected error occurred when selling shares.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total tokens across all outcomes
  const totalOutcomeTokens = answers.reduce((sum, a) => sum + a.tokens, 0);

  // Calculate market probability for each outcome
  const getOutcomeProbability = (answer: Answer) => {
    return totalOutcomeTokens > 0
      ? ((answer.tokens / totalOutcomeTokens) * 100).toFixed(0)
      : '0';
  };

  // Calculate potential return if outcome wins
  const calculatePotentialReturn = (): string => {
    if (!selectedAnswer) return formatCurrency(0);
    
    if (tradeType === 'buy') {
      // For buying, potential return is the number of shares
      // Each share is worth $1 if the outcome wins
      const potentialReturn = computedShares;
      return formatCurrency(potentialReturn);
    } else {
      // For selling, we show how much money they'll receive
      const currentOdds = selectedAnswer.tokens / totalOutcomeTokens;
      const receivedAmount = totalPrice * currentOdds;
      return formatCurrency(receivedAmount);
    }
  };

  // Calculate the estimated amount received when selling
  const calculateSellAmount = (): string => {
    if (!selectedAnswer || tradeType !== 'sell') return formatCurrency(0);
    
    const currentOdds = selectedAnswer.tokens / totalOutcomeTokens;
    const receivedAmount = totalPrice * currentOdds;
    return formatCurrency(receivedAmount);
  };

  // Handle submit based on trade type
  const handleSubmit = tradeType === 'buy' ? handleBuy : handleSell;

  // Loading skeletons for different parts of the form
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-[#2C2C2C] rounded w-3/4 mb-4"></div>
      <div className="h-10 bg-[#2C2C2C] rounded w-full mb-4"></div>
      <div className="h-10 bg-[#2C2C2C] rounded w-full mb-4"></div>
    </div>
  );

  const isLoading = isUserLoading || isMarketLoading;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-2xl shadow-lg border border-[#2C2C2C] p-6">
        {/* Market Title */}
        <div className="mb-6">
          {isMarketLoading ? (
            <div className="h-6 bg-[#2C2C2C] rounded w-2/3 animate-pulse"></div>
          ) : (
            <h2 className="text-white text-xl font-semibold">
              {market?.name}
            </h2>
          )}
        </div>

        {/* Trade Type Selector */}
        <div className="flex mb-6">
          <button
            onClick={() => setTradeType('buy')}
            className={`w-1/2 py-2 ${
              tradeType === 'buy' 
                ? 'bg-blue-600 text-white' 
                : 'bg-[#2C2C2C] text-gray-400'
            } rounded-l-lg transition-colors`}
            disabled={isLoading}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`w-1/2 py-2 ${
              tradeType === 'sell' 
                ? 'bg-blue-600 text-white' 
                : 'bg-[#2C2C2C] text-gray-400'
            } rounded-r-lg transition-colors`}
            disabled={isLoading}
          >
            Sell
          </button>
        </div>

        {/* Outcome Buttons */}
        <div className="flex gap-4 mb-6">
          {isMarketLoading ? (
            <>
              <div className="flex-1 h-12 bg-[#2C2C2C] rounded-lg animate-pulse"></div>
              <div className="flex-1 h-12 bg-[#2C2C2C] rounded-lg animate-pulse"></div>
            </>
          ) : answers.length > 0 ? (
            answers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => setSelectedAnswer(answer)}
                className={`flex-1 py-3 rounded-lg transition-colors ${
                  selectedAnswer?.id === answer.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2C2C2C] text-gray-400 hover:bg-[#3C3C3C]'
                }`}
                disabled={isLoading}
              >
                <div className="flex justify-between px-4">
                  <span>{answer.name}</span>
                  <span>{getOutcomeProbability(answer)}¢</span>
                </div>
              </button>
            ))
          ) : (
            <div className="w-full text-center text-gray-400 py-3">
              No outcomes available for this market
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">
            {tradeType === 'buy' ? 'Amount to Spend ($)' : 'Shares to Sell'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {tradeType === 'buy' ? '$' : '#'}
            </span>
            <input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(Number(e.target.value))}
              className="w-full bg-[#2C2C2C] text-white py-3 pl-6 pr-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Sell All button - only show when in sell mode and there's a selected outcome with shares */}
        {tradeType === 'sell' && selectedAnswer && userShares[selectedAnswer.id] > 0 && (
          <button
            onClick={() => setTotalPrice(formatShares(userShares[selectedAnswer.id] || 0))}
            className="mb-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
            disabled={isLoading || isSubmitting}
          >
            Sell All ({formatShares(userShares[selectedAnswer.id] || 0).toFixed(2)} shares)
          </button>
        )}

        {/* Trade Details */}
        <div className="bg-[#2C2C2C] rounded-lg p-4 mb-6 text-sm">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">
                  {tradeType === 'buy' ? 'Shares to Receive' : 'Amount to Receive'}
                </span>
                <span className="text-white">
                  {tradeType === 'buy' 
                    ? formatShares(computedShares).toFixed(2)
                    : calculateSellAmount()
                  }
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Current odds</span>
                <span className="text-white">
                  {selectedAnswer 
                    ? (selectedAnswer.tokens / totalOutcomeTokens * 100).toFixed(1) + '%'
                    : '0%'}
                </span>
              </div>
              
              {/* Show user's current position for this outcome */}
              {selectedAnswer && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Your position</span>
                  {isSharesLoading ? (
                    <div className="h-4 bg-[#3C3C3C] rounded w-16 animate-pulse"></div>
                  ) : (
                    <span className="text-white">
                      {formatShares(userShares[selectedAnswer.id] || 0).toFixed(2)} shares
                    </span>
                  )}
                </div>
              )}
              
              {tradeType === 'buy' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {`If ${selectedAnswer?.name || 'outcome'} resolves to YES`}
                  </span>
                  <span className="text-white">
                    {calculatePotentialReturn()}
                  </span>
                </div>
              )}
              
              {tradeType === 'sell' && selectedAnswer && (
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    Shares remaining
                  </span>
                  <span className="text-white">
                    {formatShares(Math.max(0, (userShares[selectedAnswer.id] || 0) - totalPrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Button */}
        <button 
          onClick={handleSubmit}
          className={`w-full py-4 rounded-lg transition-colors flex justify-center items-center ${
            isLoading || isSubmitting || !selectedAnswer || totalPrice <= 0 || 
            (tradeType === 'sell' && selectedAnswer && 
              (!userShares[selectedAnswer.id] || 
                formatShares(totalPrice) > formatShares(userShares[selectedAnswer.id] || 0)))
              ? 'bg-gray-600 cursor-not-allowed opacity-50' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={
            isLoading || 
            isSubmitting ||
            !selectedAnswer || 
            totalPrice <= 0 || 
            (tradeType === 'sell' && selectedAnswer && 
              (!userShares[selectedAnswer.id] || 
                formatShares(totalPrice) > formatShares(userShares[selectedAnswer.id] || 0)))
          }
        >
          {isSubmitting ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedAnswer?.name || 'Outcome'}`
          )}
        </button>
        
        {/* Show helpful message if selling is disabled */}
        {!isLoading && tradeType === 'sell' && selectedAnswer && userShares[selectedAnswer.id] !== undefined && (
          <p className="text-yellow-500 text-sm mt-2 text-center">
            {formatShares(userShares[selectedAnswer.id]) <= 0 
              ? `You do not own any shares of ${selectedAnswer.name}`
              : formatShares(totalPrice) > formatShares(userShares[selectedAnswer.id])
                ? `You only own ${formatShares(userShares[selectedAnswer.id]).toFixed(2)} shares of ${selectedAnswer.name}`
                : null
            }
          </p>
        )}

        {/* Error/Success Messages */}
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        {success && <p className="mt-4 text-green-500 text-center">{success}</p>}
        
        {/* General loading indicator */}
        {isLoading && (
          <p className="mt-4 text-blue-400 text-center flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading market data...
          </p>
        )}
      </div>
    </div>
  );
}