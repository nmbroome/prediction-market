// src/lib/userPerformance.ts
//
// Per-user forecasting performance, expressed as binary-classification metrics.
//
// We deliberately DO NOT use Brier score / calibration here. On this platform a
// trade only reveals a *minimum* implied probability: buying Yes at 25¢ tells us
// the user thinks P(Yes) > 25%, not whether they believe 30% or 90%. Brier needs
// a stated probability, which we don't have — so it can't measure user skill.
//
// Instead we treat each resolved market a user traded in as one binary forecast:
// their net position picks a side (Yes/No), and the winning outcome is ground
// truth. From the confusion matrix across all of a user's forecasts we derive
// accuracy, precision, recall, F1, and AUC — each measuring something slightly
// different about forecasting skill.
//
// The compute* functions are pure (no Supabase dependency) so the sibling
// prediction-market-admin repo can import them and run against the same DB.

import supabase from "@/lib/supabase/createClient";

// ---------------------------------------------------------------------------
// Row shapes (kept local + minimal so this module is portable / copy-pastable)
// ---------------------------------------------------------------------------

export interface PerfPredictionRow {
  market_id: number;
  outcome_id: number;
  shares_amt: number | null;
  market_odds: number | null;
  trade_type: "buy" | "sell";
}

export interface PerfMarketRow {
  id: number;
  status: string;
  // Winning outcome, set on resolution.
  outcome_id: number | null;
}

export interface PerfOutcomeRow {
  id: number;
  name: string | null;
  market_id: number;
}

export interface ConfusionMatrix {
  tp: number; // predicted Yes, resolved Yes
  fp: number; // predicted Yes, resolved No
  fn: number; // predicted No,  resolved Yes
  tn: number; // predicted No,  resolved No
}

export interface UserPerformanceMetrics {
  // Each is a 0–1 rate, or null when it is mathematically undefined
  // (e.g. precision with zero predicted-Yes forecasts).
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  auc: number | null;
  // Resolved markets where the user held a net directional position.
  sampleSize: number;
  confusion: ConfusionMatrix;
}

const EMPTY_METRICS: UserPerformanceMetrics = {
  accuracy: null,
  precision: null,
  recall: null,
  f1: null,
  auc: null,
  sampleSize: 0,
  confusion: { tp: 0, fp: 0, fn: 0, tn: 0 },
};

// ---------------------------------------------------------------------------
// Positive-class ("Yes") selection
// ---------------------------------------------------------------------------

/**
 * Pick the outcome that represents the positive ("Yes") class for a market.
 * Prefers an outcome literally named "yes"; otherwise falls back to the lowest
 * outcome id so the choice is deterministic and stable across runs.
 */
function findYesOutcomeId(outcomes: PerfOutcomeRow[]): number | null {
  if (outcomes.length === 0) return null;
  const yes = outcomes.find((o) => (o.name ?? "").trim().toLowerCase() === "yes");
  if (yes) return yes.id;
  return outcomes.reduce((min, o) => (o.id < min ? o.id : min), outcomes[0].id);
}

// ---------------------------------------------------------------------------
// Core computation (pure)
// ---------------------------------------------------------------------------

interface Forecast {
  predictedYes: boolean;
  actualYes: boolean;
  // Revealed minimum probability of Yes, used only for AUC ranking.
  yesScore: number;
}

/**
 * Reduce a user's raw trades to one binary forecast per resolved market and
 * compute classification metrics. Pure — pass in already-fetched rows.
 */
export function computeUserPerformance(
  predictions: PerfPredictionRow[],
  markets: PerfMarketRow[],
  outcomes: PerfOutcomeRow[]
): UserPerformanceMetrics {
  // Resolved markets with a recorded winner.
  const winnerByMarket = new Map<number, number>();
  markets.forEach((m) => {
    if (m.status === "resolved" && m.outcome_id != null) {
      winnerByMarket.set(m.id, m.outcome_id);
    }
  });
  if (winnerByMarket.size === 0) return { ...EMPTY_METRICS };

  // Yes-outcome per market.
  const outcomesByMarket = new Map<number, PerfOutcomeRow[]>();
  outcomes.forEach((o) => {
    const list = outcomesByMarket.get(o.market_id);
    if (list) list.push(o);
    else outcomesByMarket.set(o.market_id, [o]);
  });

  // Per market: net shares per outcome, and buy price×shares for weighted entry.
  interface Agg {
    netShares: Map<number, number>;
    buyValue: Map<number, number>; // Σ market_odds·shares over buys
    buyShares: Map<number, number>; // Σ shares over buys
  }
  const aggByMarket = new Map<number, Agg>();

  for (const p of predictions) {
    if (!winnerByMarket.has(p.market_id)) continue; // only resolved markets
    let agg = aggByMarket.get(p.market_id);
    if (!agg) {
      agg = { netShares: new Map(), buyValue: new Map(), buyShares: new Map() };
      aggByMarket.set(p.market_id, agg);
    }
    const shares = p.shares_amt ?? 0;
    const signed = p.trade_type === "sell" ? -shares : shares;
    agg.netShares.set(p.outcome_id, (agg.netShares.get(p.outcome_id) ?? 0) + signed);
    if (p.trade_type === "buy" && p.market_odds != null && !Number.isNaN(p.market_odds)) {
      agg.buyValue.set(
        p.outcome_id,
        (agg.buyValue.get(p.outcome_id) ?? 0) + p.market_odds * shares
      );
      agg.buyShares.set(p.outcome_id, (agg.buyShares.get(p.outcome_id) ?? 0) + shares);
    }
  }

  const forecasts: Forecast[] = [];

  for (const [marketId, agg] of aggByMarket) {
    const winner = winnerByMarket.get(marketId)!;
    const yesId = findYesOutcomeId(outcomesByMarket.get(marketId) ?? []);
    if (yesId == null) continue;

    // Predicted outcome = the one the user holds the most net shares in.
    let predictedOutcome: number | null = null;
    let best = 0;
    for (const [outcomeId, net] of agg.netShares) {
      if (net > best) {
        best = net;
        predictedOutcome = outcomeId;
      }
    }
    if (predictedOutcome == null) continue; // fully closed out — no forecast

    const predictedYes = predictedOutcome === yesId;
    const actualYes = winner === yesId;

    // Revealed minimum P(Yes): the weighted price paid to enter the predicted
    // side. If they backed Yes, that price is a lower bound on their P(Yes);
    // if they backed No at price q, their P(Yes) lower bound is (1 − q).
    const shares = agg.buyShares.get(predictedOutcome) ?? 0;
    const avgPrice = shares > 0 ? (agg.buyValue.get(predictedOutcome) ?? 0) / shares : 0.5;
    const yesScore = predictedYes ? avgPrice : 1 - avgPrice;

    forecasts.push({ predictedYes, actualYes, yesScore });
  }

  if (forecasts.length === 0) return { ...EMPTY_METRICS };

  const confusion: ConfusionMatrix = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const f of forecasts) {
    if (f.predictedYes && f.actualYes) confusion.tp++;
    else if (f.predictedYes && !f.actualYes) confusion.fp++;
    else if (!f.predictedYes && f.actualYes) confusion.fn++;
    else confusion.tn++;
  }

  const { tp, fp, fn, tn } = confusion;
  const n = tp + fp + fn + tn;
  const accuracy = n > 0 ? (tp + tn) / n : null;
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;
  const auc = computeAuc(forecasts);

  return {
    accuracy,
    precision,
    recall,
    f1,
    auc,
    sampleSize: forecasts.length,
    confusion,
  };
}

/**
 * ROC AUC via the Mann–Whitney U statistic: the probability that a randomly
 * chosen actual-Yes forecast was given a higher Yes-score than a randomly
 * chosen actual-No forecast (ties count as ½). Undefined (null) unless the
 * user has at least one resolved-Yes and one resolved-No forecast.
 */
function computeAuc(forecasts: Forecast[]): number | null {
  const pos = forecasts.filter((f) => f.actualYes).map((f) => f.yesScore);
  const neg = forecasts.filter((f) => !f.actualYes).map((f) => f.yesScore);
  if (pos.length === 0 || neg.length === 0) return null;

  let concordant = 0;
  for (const p of pos) {
    for (const q of neg) {
      if (p > q) concordant += 1;
      else if (p === q) concordant += 0.5;
    }
  }
  return concordant / (pos.length * neg.length);
}

// ---------------------------------------------------------------------------
// Fetch wrapper (Supabase)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;

/**
 * Load a user's trades + the relevant resolved markets/outcomes and compute
 * their forecasting metrics. `userId` is the Supabase auth uuid
 * (predictions.user_id), so an admin can pass any user's id.
 */
export async function getUserPerformance(
  userId: string
): Promise<UserPerformanceMetrics> {
  // 1. All of this user's trades (paged — a select caps at 1000 rows).
  const predictions: PerfPredictionRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("predictions")
      .select("market_id, outcome_id, shares_amt, market_odds, trade_type")
      .eq("user_id", userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data as PerfPredictionRow[]) || [];
    predictions.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  if (predictions.length === 0) return { ...EMPTY_METRICS };

  const marketIds = Array.from(new Set(predictions.map((p) => p.market_id)));

  // 2. Which of those markets are resolved, and their winning outcome.
  const { data: marketsData, error: marketsError } = await supabase
    .from("markets")
    .select("id, status, outcome_id")
    .in("id", marketIds)
    .eq("status", "resolved")
    .not("outcome_id", "is", null);

  if (marketsError) throw new Error(marketsError.message);
  const markets = (marketsData as PerfMarketRow[]) || [];
  if (markets.length === 0) return { ...EMPTY_METRICS };

  // 3. Outcomes for the resolved markets (to identify each market's Yes side).
  const resolvedMarketIds = markets.map((m) => m.id);
  const { data: outcomesData, error: outcomesError } = await supabase
    .from("outcomes")
    .select("id, name, market_id")
    .in("market_id", resolvedMarketIds);

  if (outcomesError) throw new Error(outcomesError.message);
  const outcomes = (outcomesData as PerfOutcomeRow[]) || [];

  return computeUserPerformance(predictions, markets, outcomes);
}
