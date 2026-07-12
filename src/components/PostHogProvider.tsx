"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// PostHog analytics for the player app. Privacy posture (see Privacy Policy
// §3.3/§10): NO IP capture (also enforce "Discard client IP data" in the
// PostHog project settings), NO PII (identify users only by their app UUID,
// never email/paypal/payment_id), and session replay with ALL inputs masked so
// typed forecast rationales and payment details never reach PostHog.
export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Don't build person profiles for anonymous visitors.
      person_profiles: "identified_only",
      // App Router: we capture $pageview manually on navigation (below).
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      // PostHog Error Tracking: auto-capture uncaught exceptions.
      capture_exceptions: true,
      session_recording: {
        // Mask every input/textarea/select value — this is what keeps typed
        // forecast rationales, comments, and payment fields out of replays.
        maskAllInputs: true,
        // Additionally mask any element tagged data-ph-mask (use on displayed
        // sensitive text if needed).
        maskTextSelector: "[data-ph-mask]",
      },
    });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// Manual pageview capture for the Next.js App Router (posthog-js can't see
// client-side route changes on its own here).
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += "?" + qs;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}
