"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase/createClient";
import Link from "next/link";

// Nudge shown to logged-in players who don't have PayPal set as their payout
// method. Covers two cases: users still on MTurk (which is being retired) and
// users who never provided any payment info at all. Both are un-payable until
// they add PayPal on the profile page.
export default function MigrationBanner() {
  const [needsPayPal, setNeedsPayPal] = useState(false);
  const [isMTurk, setIsMTurk] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkPaymentMethod = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNeedsPayPal(false);
        return;
      }

      // profiles.id is a bigint, so the auth user must be matched on user_id.
      const { data, error } = await supabase
        .from("profiles")
        .select("payment_method")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;

      const method = (data.payment_method || "").trim();
      if (method !== "PayPal") {
        setNeedsPayPal(true);
        setIsMTurk(method === "MTurk");
      } else {
        setNeedsPayPal(false);
      }
    };

    checkPaymentMethod();

    // Re-check on login/logout so the banner appears right after sign-in.
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkPaymentMethod();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (!needsPayPal || dismissed) return null;

  return (
    <div className="w-full bg-amber-500 text-black px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm font-medium">
        {isMTurk
          ? "⚠️ You're set up to receive payouts via MTurk, which is being discontinued. Add your PayPal info so you don't miss future payouts."
          : "⚠️ We don't have your PayPal info on file. Add it so you can receive your payouts."}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/profile"
          className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-semibold hover:bg-gray-800 whitespace-nowrap"
        >
          Add PayPal
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="px-2 text-black/70 hover:text-black text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
