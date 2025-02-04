"use client";

import React, { useEffect, useState } from "react";
import supabase from '@/lib/supabase/createClient';
import { User } from "@supabase/supabase-js";
import Onboarding from "@/components/Onboarding";

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isInUserInfo, setIsInUserInfo] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError.message);
        setUser(null);
        setIsInUserInfo(null);
        return;
      }

      setUser(userData.user);

      if (userData.user) {
        const { data: userInfoData, error: userInfoError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userData.user.id)
          .single();

        if (userInfoError) {
          console.error("Error checking user_info:", userInfoError.message);
          setIsInUserInfo(false);
        } else {
          setIsInUserInfo(!!userInfoData);
          setUsername(userInfoData?.username || "");
        }
      } else {
        setIsInUserInfo(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const saveUsername = async () => {
    if (!user) return;
    setLoading(true);
  
    // Fetch the existing user profile data
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
  
    if (fetchError) {
      console.error("Error fetching user profile:", fetchError.message);
      setLoading(false);
      return;
    }
  
    // Update only the username while keeping existing profile data intact
    const updatedProfile = {
      ...existingProfile,
      username, // Updating the username
    };
  
    // Upsert the updated profile
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(updatedProfile);
  
    if (updateError) {
      console.error("Error updating username:", updateError.message);
    }
  
    setLoading(false);
  };
  

  if (isInUserInfo === null) {
    return <p>Loading user data...</p>;
  }

  if (isInUserInfo === false) {
    return <Onboarding />;
  }

  return (
    <div className="container mt-4 text-white">
      {user ? (
        <>
          <h2>Your Profile</h2>
          <div className="mt-4">
            <div className="flex-col">
              <label htmlFor="username">Username: </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="text-black p-2 rounded"
              />
              <button
                onClick={saveUsername}
                className="ml-2 bg-blue-500 p-2 rounded text-white"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <p>Email: {user.email}</p>
              <p>Balance: </p>
              <p>Player ID: </p>
            </div>
            <div className="flex-col">
              <p>Payment info</p>
            </div>
            <h3>Holdings</h3>
            <h3>Prediction history</h3>
          </div>
        </>
      ) : (
        <p>Loading user data or not logged in...</p>
      )}
    </div>
  );
}
