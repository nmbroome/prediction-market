"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import LogoutButton from "./logout-button";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className="flex w-full justify-between items-center p-4 bg-transparent text-white relative">
      {/* Left section: Brand - always visible */}
      <Link href="/">
        <h1 className="text-3xl font-bold">Prophet V3</h1>
      </Link>

      {/* Right section */}
      <div className="relative">
        {/* Hamburger button - visible on mobile only */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden flex flex-col gap-1 p-2"
          aria-label="Toggle menu"
        >
          <span className="w-6 h-0.5 bg-white"></span>
          <span className="w-6 h-0.5 bg-white"></span>
          <span className="w-6 h-0.5 bg-white"></span>
        </button>

        {/* Desktop menu - hidden on mobile */}
        <div className="hidden sm:flex space-x-4">
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
          <Link
            href="/analytics"
            className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          >
            Analytics
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

        {/* Mobile dropdown menu */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg sm:hidden z-50">
            <div className="flex flex-col p-2 gap-2">
              <Link
                href="/markets"
                className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Markets
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                href="/analytics"
                className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Analytics
              </Link>
              {user && (
                <Link
                  href="/profile"
                  className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
              )}
              {user ? (
                <div onClick={() => setIsMenuOpen(false)}>
                  <LogoutButton />
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2 bg-green-500 rounded-md hover:bg-green-600 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}