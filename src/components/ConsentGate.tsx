"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabase/createClient";
import { getConsentStatus, hasAcceptedTos, recordConsent } from "@/lib/consent";

// Blocks authenticated users who have not yet accepted the Terms of Service.
// Catches both new users (after email confirmation) and every existing user,
// and writes the durable acceptance record on their first authenticated session.
export default function ConsentGate() {
  const [userId, setUserId] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (uid: string | null) => {
    if (!uid) {
      setUserId(null);
      setNeedsConsent(false);
      return;
    }
    setUserId(uid);
    const status = await getConsentStatus(uid);
    // If the profile row isn't readable yet, don't lock the user out — the
    // addPrediction guard still prevents trading until ToS is accepted.
    setNeedsConsent(!!status && !hasAcceptedTos(status));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => check(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      check(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  if (!needsConsent || !userId) return null;

  const canSubmit = agreed && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordConsent(userId);
      setNeedsConsent(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg space-y-5 rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="text-2xl font-bold text-white">Before you continue</h2>
        <p className="text-sm text-gray-300">
          Prophet is a research platform. Using it means taking part in the
          research it produces: when a market resolves, your forecasts on it
          become part of a permanent public research archive, and a coded
          (de-identified) copy of your trading history may be shared with
          researchers under a Data Use Agreement. This is part of participating,
          not an optional choice.
        </p>

        <label className="flex items-start gap-3 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>
            I have read and agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-blue-400 hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-blue-400 hover:underline"
            >
              Privacy Policy
            </Link>
            , including the research participation they describe.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
