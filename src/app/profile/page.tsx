"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import TradeHistory from "@/components/TradeHistory";
import { calculatePNL } from "@/lib/calculatePNL";
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

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newUsername, setNewUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showTradeHistory, setShowTradeHistory] = useState<boolean>(false);

  // State for PNL metrics
  const [pnlMetrics, setPnlMetrics] = useState<{
    totalPNL: number;
    percentageChange: number;
  } | null>(null);
  const [pnlError, setPnlError] = useState<string | null>(null);

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
        try {
          const result = await calculatePNL(user.id);
          setPnlMetrics(result);
        } catch (err: unknown) {
          let errorMessage = "Error calculating PNL";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setPnlError(errorMessage);
          console.log(pnlError);
        }        
      };
      fetchPNL();
    }
  }, [user]);

  const openEditModal = () => {
    if (!profile) return;
    setNewUsername(profile.username || "");
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setNewUsername("");
  };

  const saveUsername = async () => {
    if (!profile) return;
    setLoading(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: newUsername })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating username:", updateError.message);
    } else {
      setProfile({ ...profile, username: newUsername });
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

  return (
    <div className="bg-[#111] min-h-screen p-6">
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
              className="ml-auto bg-[#222] text-white px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#222] rounded-lg p-4">
              <div className="text-gray-400 mb-2">Positions value</div>
              <div className="text-white font-bold text-xl">
                {formatCurrency(0)}
              </div>
            </div>
            <div className="bg-[#222] rounded-lg p-4">
              <div className="text-gray-400 mb-2">Profit/loss</div>
              <div className={`font-bold text-xl ${pnlMetrics && pnlMetrics.totalPNL < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {pnlMetrics ? formatCurrency(pnlMetrics.totalPNL) : 'Loading...'}
              </div>
            </div>
            <div className="bg-[#222] rounded-lg p-4">
              <div className="text-gray-400 mb-2">Volume traded</div>
              <div className="text-white font-bold text-xl">
                {formatCurrency(2607.97)}
              </div>
            </div>
            <div className="bg-[#222] rounded-lg p-4">
              <div className="text-gray-400 mb-2">Markets traded</div>
              <div className="text-white font-bold text-xl">6</div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-[#222] rounded-lg p-6 mb-6">
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
            className="w-full bg-[#222] text-white py-3 rounded-lg hover:bg-[#333] transition-colors"
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
          onClose={closeEditModal}
          onSave={saveUsername}
          loading={loading}
        />
      )}
    </div>
  );
}