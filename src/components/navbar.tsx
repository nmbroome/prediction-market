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
      <Link href="/">
        <h1 className="text-3xl font-bold">Prediction Market</h1>
      </Link>
      <div className="flex space-x-4">
        <Link
          href="/markets"
          className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Markets
        </Link>
        {user && (
          <Link
            href="/profile"
            className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600"
          >
            Profile
          </Link>
        )}
        {user ? (
          <LogoutButton />
        ) : (
          <Link
            href="/auth"
            className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600"
          >
            Log In
          </Link>
        )}
      </div>
    </nav>
  );
}
