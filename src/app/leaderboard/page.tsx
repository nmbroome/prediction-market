import Leaderboard, { SafeLeaderboardEntry } from "@/components/Leaderboard";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server-client";

// Fetch per-request on the server so we can strip PII before anything reaches
// the browser.
export const dynamic = "force-dynamic";

// The leaderboards.data jsonb blob carries whole profile-ish rows, including
// payment_id (PayPal email). Project down to ONLY the fields the public board
// renders. This runs on the server; payment_id never leaves it.
function sanitize(raw: unknown): SafeLeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return {
      user_id: String(e.user_id ?? ""),
      username: e.username == null ? null : String(e.username),
      total_profit_loss: Number(e.total_profit_loss) || 0,
      percent_pnl: Number(e.percent_pnl) || 0,
    };
  });
}

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerComponentClient();

  // Two most recent snapshots (today + yesterday) for rank-change deltas.
  const { data, error } = await supabase
    .from("leaderboards")
    .select("data, calculation_date, created_at")
    .order("calculation_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2);

  const current = data?.[0]?.data ? sanitize(data[0].data) : [];
  const previous = data?.[1]?.data ? sanitize(data[1].data) : null;

  const message = error
    ? "Failed to load leaderboard data"
    : current.length === 0
    ? "No leaderboard data found"
    : null;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full p-4">
      <Leaderboard current={current} previous={previous} error={message} />
    </div>
  );
}
