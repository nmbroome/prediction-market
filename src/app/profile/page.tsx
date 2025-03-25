"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import TradeHistory from "@/components/TradeHistory";
import { calculatePNL } from "@/lib/calculatePNL";
import { User } from "@supabase/supabase-js";
import EditProfileModal from "@/components/EditProfileModal"; // adjust the path as needed

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

  return (
    <div className="container mt-4 p-4 text-white">
      {user && profile ? (
        <>
          <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
          <div className="border border-gray-600 p-4 rounded-lg">
            <p>
              <strong>Username:</strong> {profile.username}{" "}
              <button
                onClick={openEditModal}
                className="ml-2 bg-blue-500 text-white p-1 rounded"
              >
                Edit
              </button>
            </p>
            <p>
              <strong>Email:</strong> {profile.email || "N/A"}
            </p>
            <p>
              <strong>Balance:</strong> {profile.balance ?? "N/A"}
            </p>
            <p>
              <strong>Player ID:</strong> {profile.id}
            </p>
            <p>
              <strong>Payment ID:</strong> {profile.payment_id || "N/A"}
            </p>
            <div className="mt-2">
              {pnlError && <p className="text-red-500">Error: {pnlError}</p>}
              {pnlMetrics ? (
                <>
                  <p>
                    <strong>Total PNL:</strong> {pnlMetrics.totalPNL.toFixed(2)}
                  </p>
                  <p>
                    <strong>Percentage Change:</strong> {pnlMetrics.percentageChange.toFixed(2)}%
                  </p>
                </>
              ) : (
                <p>Calculating Profit/Loss...</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowTradeHistory(!showTradeHistory)}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {showTradeHistory ? "Hide Trade History" : "Show Trade History"}
            </button>
          </div>
          {showTradeHistory && user && <TradeHistory userId={user.id} />}
        </>
      ) : (
        <p>Loading user data or not logged in...</p>
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
