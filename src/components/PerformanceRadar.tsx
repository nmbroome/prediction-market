// src/components/PerformanceRadar.tsx
"use client";

import React, { memo, useEffect, useId, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import supabase from "@/lib/supabase/createClient";
import {
  getUserPerformance,
  UserPerformanceMetrics,
} from "@/lib/userPerformance";

interface PerformanceRadarProps {
  /**
   * Supabase auth uuid of the user to render. Omit to use the logged-in user —
   * pass an explicit id (e.g. from an admin view) to inspect anyone.
   */
  userId?: string;
  /**
   * Pre-computed metrics. When provided the component renders these directly
   * and skips fetching — useful for the admin repo (which may compute metrics
   * server-side) and for previewing the chart with known values.
   */
  metrics?: UserPerformanceMetrics;
  title?: string;
}

interface AxisDef {
  key: keyof Pick<
    UserPerformanceMetrics,
    "accuracy" | "precision" | "recall" | "f1" | "auc"
  >;
  label: string;
  description: string;
}

// Order controls the radar's clockwise axis layout.
const AXES: AxisDef[] = [
  { key: "accuracy", label: "Accuracy", description: "Forecasts you got right, overall" },
  { key: "precision", label: "Precision", description: "Of your Yes calls, how many resolved Yes" },
  { key: "recall", label: "Recall", description: "Of markets that resolved Yes, how many you called" },
  { key: "f1", label: "F1", description: "Balance of precision and recall" },
  { key: "auc", label: "AUC", description: "How well your conviction ranked winners over losers" },
];

interface RadarPoint {
  label: string;
  value: number; // 0–100 for the chart
  raw: number | null; // 0–1, or null when undefined for this user
  description: string;
}

// Threshold styling mirrors the reference: strong / needs-work / weak.
// `rate` is a 0–1 metric (or null when undefined for this user).
function ratingIcon(rate: number | null): string {
  if (rate == null) return "⚪";
  if (rate >= 0.7) return "✅";
  if (rate >= 0.4) return "⚠️";
  return "🚨";
}

function ratingColor(rate: number | null): string {
  if (rate == null) return "#6B7280";
  if (rate >= 0.7) return "#A855F7";
  if (rate >= 0.4) return "#F59E0B";
  return "#EF4444";
}

function fmtPct(raw: number | null): string {
  return raw == null ? "N/A" : `${Math.round(raw * 100)}%`;
}

// --------------------------------------------------------------------------
// The radar itself — a hand-built SVG using d3 scales + radial path helpers.
// A fixed viewBox means it scales fluidly with its container via CSS, so it
// needs no JS width measurement (unlike a charting lib's ResponsiveContainer).
// --------------------------------------------------------------------------

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_R = 118;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];

function RadarSvg({ data }: { data: RadarPoint[] }) {
  const uid = useId().replace(/:/g, "");
  const fillId = `radarFill-${uid}`;
  const glowId = `radarGlow-${uid}`;

  const n = data.length;
  const rScale = useMemo(
    () => scaleLinear().domain([0, 100]).range([0, MAX_R]),
    []
  );

  // Round emitted coordinates: raw Math.sin/cos floats serialize a hair
  // differently between server and client, which trips React's hydration
  // check. 2 decimals is well below sub-pixel and matches exactly on both.
  const rnd = (v: number) => Math.round(v * 100) / 100;

  // Angle for axis i: 0 at 12 o'clock, proceeding clockwise.
  const angleOf = (i: number) => (i / n) * 2 * Math.PI;
  const pointAt = (i: number, r: number) => ({
    x: rnd(Math.sin(angleOf(i)) * r),
    y: rnd(-Math.cos(angleOf(i)) * r),
  });

  const polyPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`).join("") + "Z";

  const dataPath = polyPath(data.map((d, i) => pointAt(i, rScale(d.value))));
  const ringPath = (level: number) =>
    polyPath(data.map((_, i) => pointAt(i, MAX_R * level)));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto max-h-96 overflow-visible"
      role="img"
      aria-label="Forecasting performance radar"
    >
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#C084FC" stopOpacity={0.7} />
          <stop offset="70%" stopColor="#8B5CF6" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.12} />
        </radialGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform={`translate(${CENTER}, ${CENTER})`}>
        {/* Concentric grid rings */}
        {RINGS.map((level) => (
          <path
            key={level}
            d={ringPath(level)}
            fill="none"
            stroke="#334155"
            strokeOpacity={level === 1 ? 0.55 : 0.28}
            strokeWidth={1}
          />
        ))}

        {/* Spokes + outer axis labels */}
        {data.map((d, i) => {
          const outer = pointAt(i, MAX_R);
          const lp = pointAt(i, MAX_R + 24);
          const anchor =
            Math.sin(angleOf(i)) > 0.15
              ? "start"
              : Math.sin(angleOf(i)) < -0.15
              ? "end"
              : "middle";
          const baseline =
            lp.y < -2 ? "auto" : lp.y > 2 ? "hanging" : "middle";
          return (
            <g key={d.label}>
              <line
                x1={0}
                y1={0}
                x2={outer.x}
                y2={outer.y}
                stroke="#334155"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline={baseline}
                fill="#CBD5E1"
                fontSize={12.5}
                fontWeight={500}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Data area */}
        <g className="radar-pop" style={{ transformOrigin: "center" }}>
          <path
            d={dataPath}
            fill={`url(#${fillId})`}
            stroke="#C084FC"
            strokeWidth={2.5}
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
          />

          {/* Vertex value nodes */}
          {data.map((d, i) => {
            const p = pointAt(i, rScale(d.value));
            return (
              <g key={d.label}>
                <circle cx={p.x} cy={p.y} r={13} fill="#1E1B2E" stroke="#A855F7" strokeWidth={1.5} />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#E9D5FF"
                  fontSize={11}
                  fontWeight={700}
                >
                  {d.raw == null ? "–" : Math.round(d.value)}
                </text>
              </g>
            );
          })}
        </g>
      </g>

      <style>{`
        .radar-pop { animation: radarPop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes radarPop {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </svg>
  );
}

const PerformanceRadar = memo(({ userId, metrics: metricsProp, title = "Forecasting Performance" }: PerformanceRadarProps) => {
  const [metrics, setMetrics] = useState<UserPerformanceMetrics | null>(metricsProp ?? null);
  const [loading, setLoading] = useState(!metricsProp);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Caller supplied metrics directly — nothing to fetch.
    if (metricsProp) {
      setMetrics(metricsProp);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let targetId = userId;
        if (!targetId) {
          const { data, error: authError } = await supabase.auth.getUser();
          if (authError || !data.user) throw new Error("Not signed in");
          targetId = data.user.id;
        }
        const result = await getUserPerformance(targetId);
        if (!cancelled) setMetrics(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load performance");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, metricsProp]);

  const cardClass =
    "bg-gradient-to-br from-gray-900 to-gray-900/60 rounded-2xl p-6 border border-gray-800 mb-8";

  if (loading) {
    return (
      <div className={cardClass}>
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardClass}>
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!metrics || metrics.sampleSize === 0) {
    return (
      <div className={cardClass}>
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-center px-4">
          No resolved forecasts yet. Metrics appear once markets you&apos;ve traded
          in resolve.
        </div>
      </div>
    );
  }

  const data: RadarPoint[] = AXES.map((axis) => {
    const raw = metrics[axis.key];
    return {
      label: axis.label,
      value: raw == null ? 0 : Math.round(raw * 100),
      raw,
      description: axis.description,
    };
  });

  return (
    <div className={cardClass}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Each resolved market you traded in counts as one Yes/No forecast,
            scored against how the market actually resolved.
          </p>
        </div>
        <div className="rounded-xl px-4 py-2 border border-purple-500/30 bg-purple-500/10 text-center shrink-0">
          <div className="text-purple-200/70 text-xs">Forecasts</div>
          <div className="text-2xl font-bold text-purple-300">{metrics.sampleSize}</div>
          <div className="text-purple-200/50 text-xs">resolved</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Radar */}
        <div className="flex items-center justify-center px-2 py-4">
          <RadarSvg data={data} />
        </div>

        {/* Interpretation */}
        <div>
          <h4 className="text-white font-medium mb-4">Interpretation</h4>
          <ul className="space-y-4">
            {data.map((point) => (
              <li key={point.label}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm flex items-center gap-2">
                    <span className="text-base leading-none">{ratingIcon(point.raw)}</span>
                    <span className="font-medium">{point.label}</span>
                  </span>
                  <span className="text-sm font-semibold" style={{ color: ratingColor(point.raw) }}>
                    {fmtPct(point.raw)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700/60 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${point.value}%`,
                      background: `linear-gradient(90deg, ${ratingColor(point.raw)}88, ${ratingColor(point.raw)})`,
                    }}
                  />
                </div>
                <div className="text-gray-500 text-xs mt-1.5">{point.description}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

PerformanceRadar.displayName = "PerformanceRadar";

export default PerformanceRadar;
