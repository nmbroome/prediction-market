"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import LogoutButton from "./logout-button";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <nav className="flex w-full justify-between items-center p-4 bg-transparent text-white">
      {/* Left section: Brand */}
      <Link href="/">
        <h1 className="text-3xl font-bold">Prophet V3</h1>
      </Link>

      {/* Right section */}
      <div className="flex space-x-4">
        <Link
          href="/markets"
          className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          Markets
        </Link>
        <Link
          href="/leaderboard"
          className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          Leaderboard
        </Link>
        {user && (
          <Link
            href="/profile"
            className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          >
            Profile
          </Link>
        )}
        {user ? (
          <LogoutButton />
        ) : (
          <Link
            href="/auth"
            className="px-4 py-2 bg-green-500 rounded-md hover:bg-green-600 transition-colors font-medium"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}