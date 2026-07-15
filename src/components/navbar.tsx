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
    <nav className="glass sticky top-0 z-40 flex w-full justify-between items-center px-5 sm:px-8 py-3.5 text-white relative border-b border-[var(--border)]">
      {/* Left section: Brand - always visible */}
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold shadow-lg shadow-indigo-900/40 transition-transform group-hover:scale-105">
          P
        </span>
        <h1 className="text-xl font-bold tracking-tight">
          Prophet <span className="text-[var(--muted)] font-semibold">V4</span>
        </h1>
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
        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/markets"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
          >
            Markets
          </Link>
          <Link
            href="/leaderboard"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/analytics"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
          >
            Analytics
          </Link>
          {user && (
            <Link
              href="/profile"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
            >
              Profile
            </Link>
          )}
          <span className="mx-1.5 h-5 w-px bg-[var(--border)]" />
          {user ? (
            <LogoutButton />
          ) : (
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-900/30"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {isMenuOpen && (
          <div className="glass absolute top-full right-0 mt-3 w-52 rounded-xl border border-[var(--border)] shadow-2xl shadow-black/40 sm:hidden z-50 overflow-hidden">
            <div className="flex flex-col p-2 gap-0.5">
              {[
                { href: "/markets", label: "Markets" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/analytics", label: "Analytics" },
                ...(user ? [{ href: "/profile", label: "Profile" }] : []),
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-[var(--border)]" />
              {user ? (
                <div onClick={() => setIsMenuOpen(false)}>
                  <LogoutButton />
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="px-3.5 py-2.5 rounded-lg text-sm font-semibold text-center bg-indigo-500 hover:bg-indigo-600 transition-colors"
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