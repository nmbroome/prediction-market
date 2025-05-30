"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import TradeHistory from "@/components/TradeHistory";
import { User } from "@supabase/supabase-js";
import EditProfileModal from "@/components/EditProfileModal";

// Profile interface
interface Profile {
  id: string;
  username: string;
  email?: string;
  balance?: number;
  payment_id?: string;
}

// PNL Metrics interface
interface PnlMetrics {
  totalPNL: number;
  percentageChange: number;
  volumeTraded: number;
  marketsTraded: number;
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newUsername, setNewUsername] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showTradeHistory, setShowTradeHistory] = useState<boolean>(false);

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
        .select("id, username, email, balance, payment_id")
        .eq("user_id", userData.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        return;
      }
      setProfile(profileData);
    };

    fetchUserProfile();
  }, []);

  // Fetch PNL metrics once the user is available
  useEffect(() => {
    if (user) {
      const fetchPNL = async () => {
        setIsLoadingPnl(true);
        try {
          // Fetch all predictions for this user
          const { data: predictionsData, error: predictionsError } = await supabase
            .from("predictions")
            .select("market_id, trade_value")
            .eq("user_id", user.id);

          if (predictionsError) throw predictionsError;

          // Fetch all payouts for this user (if any)
          const { data: payoutsData, error: payoutsError } = await supabase
            .from("payouts")
            .select("*")
            .eq("user_id", user.id);

          if (payoutsError) {
            console.warn("Error fetching payouts:", payoutsError);
          }

          // Calculate total PNL from predictions
          let totalPNL = 0;
          if (predictionsData) {
            totalPNL = predictionsData.reduce((acc, pred) => acc + (pred.trade_value || 0), 0);
          }

          // Add payouts if any
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

          // Get user's balance (or default to 100 if not available)
          const balance = (profile?.balance || 100);
          
          // Calculate percentage PNL based on the balance
          // Avoid division by zero
          const percentageChange = balance > 0 ? (totalPNL / balance) * 100 : 0;

          // Calculate volume traded (absolute sum of all transactions)
          const volumeTraded = predictionsData 
            ? predictionsData.reduce((acc, pred) => acc + Math.abs(pred.trade_value || 0), 0)
            : 0;

          // Calculate number of unique markets traded
          const uniqueMarkets = new Set(predictionsData?.map(pred => pred.market_id) || []);
          
          setPnlMetrics({
            totalPNL,
            percentageChange,
            volumeTraded,
            marketsTraded: uniqueMarkets.size
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
    setPaymentId(profile.payment_id || "");
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setNewUsername("");
    setPaymentId("");
  };

  const saveProfile = async () => {
    if (!profile) return;
    setLoading(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        username: newUsername,
        payment_id: paymentId
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile:", updateError.message);
    } else {
      setProfile({ 
        ...profile, 
        username: newUsername,
        payment_id: paymentId 
      });
      closeEditModal();
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen p-6">
      {user && profile ? (
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="flex items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-purple-500 rounded-full mr-6"></div>
            <div>
              <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
              <p className="text-gray-400">Joined Nov 2020</p>
            </div>
            <button 
              onClick={openEditModal}
              className="ml-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border-2 border-gray-400 p-4">
              <div className="text-gray-400 mb-2">Positions value</div>
              <div className="text-white font-bold text-xl">
                {formatCurrency(0)}
              </div>
            </div>
            <div className="border-2 border-gray-400 rounded-lg p-4">
              <div className="text-gray-400 mb-2">Profit/loss</div>
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
            <div className="border-2 border-gray-400 rounded-lg p-4">
              <div className="text-gray-400 mb-2">Volume traded</div>
              <div className="text-white font-bold text-xl">
                {isLoadingPnl ? (
                  <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
                ) : (
                  formatCurrency(pnlMetrics?.volumeTraded || 0)
                )}
              </div>
            </div>
            <div className="border-2 border-gray-400 rounded-lg p-4">
              <div className="text-gray-400 mb-2">Markets traded</div>
              <div className="text-white font-bold text-xl">
                {isLoadingPnl ? (
                  <div className="animate-pulse h-6 bg-gray-600 rounded"></div>
                ) : (
                  pnlMetrics?.marketsTraded || 0
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="border-2 border-gray-400 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Email</p>
                <p className="text-white">{profile.email || 'N/A'}</p>
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
                <p className="text-gray-400">Payment ID</p>
                <p className="text-white">{profile.payment_id || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Trade History Toggle */}
          <button
            onClick={() => setShowTradeHistory(!showTradeHistory)}
            className="w-full border-2 border-gray-400 text-white py-3 rounded-lg hover:bg-[#333] transition-colors"
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