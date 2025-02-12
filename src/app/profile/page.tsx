"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabase/createClient";
import { User } from "@supabase/supabase-js";

// Profile interface
interface Profile {
  id: string;
  username: string;
  email?: string;
  balance?: number;
}

// Prediction interface (for trade history)
interface Prediction {
  id: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  predict_amt: number;
  return_amt: number;
  created_at: string;
}

// TradeHistory component which fetches and displays the user's prediction history
function TradeHistory({ userId }: { userId: string }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }
        setPredictions(data as Prediction[]);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error fetching trade history.");
        }
      }
      setLoading(false);
    }
    fetchPredictions();
  }, [userId]);

  if (loading) return <div>Loading trade history...</div>;
  if (error) return <div>Error: {error}</div>;
  if (predictions.length === 0)
    return <div>No trade history available.</div>;

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Trade History</h3>
      <table className="min-w-full border-collapse text-white">
        <thead>
          <tr>
            <th className="border px-4 py-2">Market ID</th>
            <th className="border px-4 py-2">Outcome ID</th>
            <th className="border px-4 py-2">Prediction Amount</th>
            <th className="border px-4 py-2">Return Amount</th>
            <th className="border px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction) => (
            <tr key={prediction.id}>
              <td className="border px-4 py-2">
                <Link
                  href={`/markets/${prediction.market_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {prediction.market_id}
                </Link>
              </td>
              <td className="border px-4 py-2">{prediction.outcome_id}</td>
              <td className="border px-4 py-2">{prediction.predict_amt}</td>
              <td className="border px-4 py-2">{prediction.return_amt}</td>
              <td className="border px-4 py-2">
                {new Date(prediction.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main UserProfile component
export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newUsername, setNewUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showTradeHistory, setShowTradeHistory] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Fetch authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error("Error fetching user:", userError?.message);
        return;
      }
      setUser(userData.user);

      // Fetch logged-in user's profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email, balance")
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
    <div className="container mt-4 text-white">
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
          </div>

          {/* Button to toggle trade history */}
          <div className="mt-4">
            <button
              onClick={() => setShowTradeHistory(!showTradeHistory)}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              {showTradeHistory ? "Hide Trade History" : "Show Trade History"}
            </button>
          </div>

          {/* Conditionally render the TradeHistory component */}
          {showTradeHistory && user && (
            <TradeHistory userId={user.id} />
          )}
        </>
      ) : (
        <p>Loading user data or not logged in...</p>
      )}

      {/* Edit Username Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl mb-2">Edit Username</h3>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="text-black p-2 rounded w-full"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={closeEditModal}
                className="bg-gray-500 text-white p-2 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={saveUsername}
                className="bg-green-500 text-white p-2 rounded"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
