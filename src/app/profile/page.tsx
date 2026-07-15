"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import TradeHistory from "@/components/TradeHistory";
import PerformanceRadar from "@/components/PerformanceRadar";
import { User } from "@supabase/supabase-js";
import EditProfileModal from "@/components/EditProfileModal";

// Profile interface
interface Profile {
  id: string;
  username: string;
  email?: string;
  balance?: number;
  payment_method?: string;
  payment_id?: string;
  enable_email_notifications?: boolean;
  tos_accepted_at?: string | null;
}

// PNL Metrics interface - Updated to include positionsValue
interface PnlMetrics {
  totalPNL: number;
  percentageChange: number;
  volumeTraded: number;
  marketsTraded: number;
  positionsValue: number; // Add this new field
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newUsername, setNewUsername] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showTradeHistory, setShowTradeHistory] = useState<boolean>(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Email notifications state
  const [emailNotifications, setEmailNotifications] = useState<boolean>(false);
  const [updatingNotifications, setUpdatingNotifications] = useState<boolean>(false);

  // State for PNL metrics
  const [pnlMetrics, setPnlMetrics] = useState<PnlMetrics | null>(null);
  const [pnlError, setPnlError] = useState<string | null>(null);
  const [isLoadingPnl, setIsLoadingPnl] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error("Error fetching user:", userError?.message);
        return;
      }
      setUser(userData.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, balance, payment_method, payment_id, enable_email_notifications, tos_accepted_at")
        .eq("user_id", userData.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        return;
      }
      setProfile(profileData);
      setEmailNotifications(profileData.enable_email_notifications ?? false);
    };

    fetchUserProfile();
  }, []);

  // Fetch PNL metrics once the user is available - Updated calculation
  useEffect(() => {
    if (user) {
      const fetchPNL = async () => {
        setIsLoadingPnl(true);
        try {
          // First, fetch ALL predictions for this user
          const { data: predictionsData, error: predictionsError } = await supabase
            .from("predictions")
            .select("market_id, trade_value, outcome_id, shares_amt, trade_type")
            .eq("user_id", user.id);

          if (predictionsError) throw predictionsError;

          // Get unique market IDs from predictions
          const marketIds = [...new Set(predictionsData?.map(pred => pred.market_id) || [])];
          
          // Fetch market statuses for these markets
          const { data: marketsData, error: marketsError } = await supabase
            .from("markets")
            .select("id, status")
            .in("id", marketIds);

          if (marketsError) throw marketsError;

          // Create a map of market ID to status for quick lookup
          const marketStatusMap = new Map<number, string>();
          marketsData?.forEach(market => {
            marketStatusMap.set(market.id, market.status);
          });

          // Fetch ALL payouts for this user (from resolved markets)
          const { data: payoutsData, error: payoutsError } = await supabase
            .from("payouts")
            .select("*")
            .eq("user_id", user.id);

          if (payoutsError) {
            console.warn("Error fetching payouts:", payoutsError);
          }

          // Calculate profit/loss from ALL markets (open/closed/resolved)
          let totalPNL = 0;
          if (predictionsData) {
            totalPNL = predictionsData.reduce((acc, pred) => acc + (pred.trade_value || 0), 0);
          }

          // Add payouts from resolved markets if any
          if (payoutsData && payoutsData.length > 0) {
            // Try different potential payout amount column names
            const possibleColumnNames = ["payout_amount", "amount", "payoutAmount", "value", "payout", "shares"];
            
            payoutsData.forEach(payout => {
              for (const colName of possibleColumnNames) {
                if (colName in payout && !isNaN(Number(payout[colName]))) {
                  totalPNL += Number(payout[colName] || 0);
                  break;
                }
              }
            });
          }

          // Calculate percentage PNL based on the base amount of 1000
          const baseAmount = 1000;
          const percentageChange = (totalPNL / baseAmount) * 100;

          // Calculate volume traded from ALL markets
          const volumeTraded = predictionsData 
            ? predictionsData.reduce((acc, pred) => acc + Math.abs(pred.trade_value || 0), 0)
            : 0;

          // Calculate number of unique markets traded (all statuses)
          const uniqueMarkets = new Set(predictionsData?.map(pred => pred.market_id) || []);

          // Calculate positions value from OPEN markets only
          // First, get current user positions from open markets
          let positionsValue = 0;
          
          if (predictionsData) {
            // Filter predictions from open markets using the market status map
            const openMarketPredictions = predictionsData.filter(
              pred => marketStatusMap.get(pred.market_id) === 'open'
            );

            if (openMarketPredictions.length > 0) {
              // Get unique open market IDs
              const openMarketIds = [...new Set(openMarketPredictions.map(pred => pred.market_id))];
              
              // For each open market, calculate user's position value
              for (const marketId of openMarketIds) {
                const marketPredictions = openMarketPredictions.filter(pred => pred.market_id === marketId);
                
                // Get current market outcomes to calculate position values
                const { data: outcomesData, error: outcomesError } = await supabase
                  .from("outcomes")
                  .select("id, tokens")
                  .eq("market_id", marketId);

                if (outcomesError || !outcomesData) continue;

                // Calculate total market tokens
                const totalMarketTokens = outcomesData.reduce((sum, outcome) => sum + outcome.tokens, 0);
                
                // Group predictions by outcome to get net position
                const positionsByOutcome = marketPredictions.reduce((acc, pred) => {
                  if (!acc[pred.outcome_id]) acc[pred.outcome_id] = 0;
                  
                  if (pred.trade_type === 'buy') {
                    acc[pred.outcome_id] += pred.shares_amt || 0;
                  } else if (pred.trade_type === 'sell') {
                    acc[pred.outcome_id] -= pred.shares_amt || 0;
                  }
                  
                  return acc;
                }, {} as Record<number, number>);

                // Calculate position value for each outcome
                for (const [outcomeId, shares] of Object.entries(positionsByOutcome)) {
                  if (shares > 0) {
                    // Find the outcome to get current odds
                    const outcome = outcomesData.find(o => o.id === Number(outcomeId));
                    if (outcome && totalMarketTokens > 0) {
                      const currentOdds = outcome.tokens / totalMarketTokens;
                      positionsValue += shares * currentOdds;
                    }
                  }
                }
              }
            }
          }
          
          setPnlMetrics({
            totalPNL,
            percentageChange,
            volumeTraded,
            marketsTraded: uniqueMarkets.size,
            positionsValue // Add this new field
          });
        } catch (err: unknown) {
          let errorMessage = "Error calculating PNL";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setPnlError(errorMessage);
          console.log(pnlError);
        } finally {
          setIsLoadingPnl(false);
        }       
      };
      fetchPNL();
    }
  }, [user, profile]);

  const openEditModal = () => {
    if (!profile) return;
    setNewUsername(profile.username || "");
    setPaymentMethod(profile.payment_method || "PayPal");
    setPaymentId(profile.payment_id || "");
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setNewUsername("");
    setPaymentMethod("");
    setPaymentId("");
  };

  const saveProfile = async () => {
    if (!profile) return;
    setLoading(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: newUsername,
        payment_method: paymentMethod,
        payment_id: paymentId
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile:", updateError.message);
    } else {
      setProfile({
        ...profile,
        username: newUsername,
        payment_method: paymentMethod,
        payment_id: paymentId
      });
      closeEditModal();
    }
    setLoading(false);
  };

  // Handle email notifications toggle
  const handleEmailNotificationsChange = async (enabled: boolean) => {
    if (!profile) return;
    
    setUpdatingNotifications(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ enable_email_notifications: enabled })
        .eq("id", profile.id);

      if (error) {
        console.error("Error updating email notifications:", error.message);
        // Revert the checkbox if update failed
        setEmailNotifications(!enabled);
      } else {
        setEmailNotifications(enabled);
        setProfile({
          ...profile,
          enable_email_notifications: enabled
        });
      }
    } catch (err) {
      console.error("Unexpected error updating email notifications:", err);
      // Revert the checkbox if update failed
      setEmailNotifications(!enabled);
    } finally {
      setUpdatingNotifications(false);
    }
  };

  // Format currency and percentage
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);
  };
  
  // Format percentage values
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    setResettingPassword(true);
    setResetEmailSent(false);

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResettingPassword(false);

    if (error) {
      console.error("Error sending reset password email:", error.message);
      return;
    }

    setResetEmailSent(true);
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      {user && profile ? (
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-indigo-900/30 grid place-items-center text-3xl font-bold text-white shrink-0">
              {(profile.username || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">{profile.username}</h1>
              <p className="text-[var(--muted)] text-sm">Forecaster · {profile.email || "member"}</p>
            </div>
            <button
              onClick={openEditModal}
              className="sm:ml-auto bg-[var(--surface-2)] border border-[var(--border)] text-white px-4 py-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-sm font-medium"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats Grid - Updated */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-gray-400 mb-2">Positions value</div>
              <div className="text-white font-bold text-xl">
                {isLoadingPnl ? (
                  <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
                ) : (
                  formatCurrency(pnlMetrics?.positionsValue || 0)
                )}
              </div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-4">
              <div className="text-gray-400 mb-2">
                Profit/loss
              </div>
              {isLoadingPnl ? (
                <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
              ) : (
                <div className={`font-bold text-xl ${pnlMetrics && pnlMetrics.percentageChange < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {pnlMetrics ? formatPercentage(pnlMetrics.percentageChange) : 'Error'}
                </div>
              )}
              {pnlMetrics && !isLoadingPnl && (
                <div className={`text-sm text-gray-300`}>
                  {formatCurrency(pnlMetrics.totalPNL)}
                </div>
              )}
            </div>
            <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-4">
              <div className="text-gray-400 mb-2">
                Volume traded
              </div>
              <div className="text-white font-bold text-xl">
                {isLoadingPnl ? (
                  <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
                ) : (
                  formatCurrency(pnlMetrics?.volumeTraded || 0)
                )}
              </div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-4">
              <div className="text-gray-400 mb-2">
                Markets traded
              </div>
              <div className="text-white font-bold text-xl">
                {isLoadingPnl ? (
                  <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
                ) : (
                  pnlMetrics?.marketsTraded || 0
                )}
              </div>
            </div>
          </div>

          {/* Forecasting Performance */}
          <PerformanceRadar userId={user.id} />

          {/* Additional Details */}
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Email</p>
                <p className="text-white mb-2">{profile.email || "N/A"}</p>

                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-white hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                >
                  {resettingPassword ? "Sending…" : "Reset Password"}
                </button>

                {resetEmailSent && (
                  <p className="mt-2 text-sm text-green-400">
                    Password reset email sent.
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-400">Player ID</p>
                <p className="text-white">{profile.id}</p>
              </div>
              <div>
                <p className="text-gray-400">Balance</p>
                <p className="text-white">{formatCurrency(profile.balance || 0)}</p>
              </div>
              <div>
                <p className="text-gray-400">Payment Method</p>
                <p className="text-white">{profile.payment_method || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400">
                  {profile.payment_method === 'MTurk' ? 'MTurk Worker ID' : 'PayPal Email'}
                </p>
                <p className="text-white">{profile.payment_id || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Email Notifications Settings */}
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Notification Settings</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-gray-400 text-sm">Receive email updates about your markets and trades</p>
              </div>
              <div className="flex items-center">
                {updatingNotifications && (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={emailNotifications}
                    onChange={(e) => handleEmailNotificationsChange(e.target.checked)}
                    disabled={updatingNotifications}
                  />
                  <div className="w-11 h-6 bg-[var(--surface-hover)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Research Participation */}
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Research Participation</h2>
            <p className="text-gray-400 text-sm">
              Prophet is a research platform. By using it you take part in the research
              it produces: your forecasts on resolved markets become part of a permanent
              public research archive, and a coded (de-identified) copy of your trading
              history may be shared with researchers under a Data Use Agreement. See the{" "}
              <a href="/terms" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline">Privacy Policy</a>.
              To stop future use of your data, close your account.
            </p>
            {profile.tos_accepted_at && (
              <p className="text-gray-500 text-xs mt-4">
                Terms accepted on{" "}
                {new Date(profile.tos_accepted_at).toLocaleDateString()}.
              </p>
            )}
          </div>

          {/* Trade History Toggle */}
          <button
            onClick={() => setShowTradeHistory(!showTradeHistory)}
            className="w-full border border-[var(--border)] bg-[var(--surface)] text-white py-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            {showTradeHistory ? 'Hide Trade History' : 'Show Trade History'}
          </button>

          {showTradeHistory && user && <TradeHistory userId={user.id} />}
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-white">Loading user data...</p>
        </div>
      )}

      {isModalOpen && (
        <EditProfileModal
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentId={paymentId}
          setPaymentId={setPaymentId}
          onClose={closeEditModal}
          onSave={saveProfile}
          loading={loading}
        />
      )}
    </div>
  );
}