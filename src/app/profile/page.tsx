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
  enable_email_notifications?: boolean;
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
        .select("id, username, email, balance, payment_id, enable_email_notifications")
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

  // Fetch PNL metrics once the user is available
  useEffect(() => {
    if (user) {
      const fetchPNL = async () => {
        setIsLoadingPnl(true);
        try {
          // Fetch all predictions for this user with market_id > 40
          const { data: predictionsData, error: predictionsError } = await supabase
            .from("predictions")
            .select("market_id, trade_value")
            .eq("user_id", user.id)
            .gt("market_id", 40); // Only include markets with ID > 40

          if (predictionsError) throw predictionsError;

          // Fetch all payouts for this user (if any) from markets with ID > 40
          const { data: payoutsData, error: payoutsError } = await supabase
            .from("payouts")
            .select("*")
            .eq("user_id", user.id)
            .gt("market_id", 40); // Only include markets with ID > 40

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

          // Use base amount of 1000 instead of user's balance
          const baseAmount = 1000;
          
          // Calculate percentage PNL based on the base amount of 1000
          const percentageChange = (totalPNL / baseAmount) * 100;

          // Calculate volume traded (absolute sum of all transactions) from markets > 40
          const volumeTraded = predictionsData 
            ? predictionsData.reduce((acc, pred) => acc + Math.abs(pred.trade_value || 0), 0)
            : 0;

          // Calculate number of unique markets traded (only markets > 40)
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
            <div className="border-2 border-gray-400 rounded-lg p-4">
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
            <div className="border-2 border-gray-400 rounded-lg p-4">
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

          {/* Email Notifications Settings */}
          <div className="border-2 border-gray-400 rounded-lg p-6 mb-6">
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
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
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