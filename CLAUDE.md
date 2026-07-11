# Prediction Market Platform

Binary prediction market platform where users trade on outcomes and receive payouts when markets resolve, priced by an automated market maker (CPMM). **This repo is the player-facing app** (browse, trade, profile, analytics); market **creation, resolution, and payouts** are handled by the sibling admin repo against the same Supabase DB (see below).

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19 RC
- **Language**: TypeScript 5 (strict mode, path alias `@/*` → `./src/*`)
- **Database & Auth**: Supabase (PostgreSQL + Auth with email/password)
- **Styling**: Tailwind CSS 3.4 (dark theme)
- **Charts**: Recharts (analytics dashboard) + custom D3 (`d3-scale`) SVG (forecasting radar)
- **Testing**: Playwright (end-to-end, `e2e/`)
- **Deployment**: Vercel (auto-deploys on push to `main`)

> **Sibling repo:** `../prediction-market-admin` (default branch `admin`) shares the **same Supabase DB** and owns market **creation**, **resolution/payouts**, DB **migrations**, and leaderboard computation. This app is mostly read + trade. Anything that mutates market lifecycle or schema likely belongs there, not here.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test:e2e     # Playwright e2e (headless)
npm run test:e2e:ui  # Playwright e2e (interactive UI)
```

## Project Structure

Every file below is wired into a route (dead/legacy code was removed 2026-07-11).
Keep it that way — if you add a component, wire it in; if something becomes
unused, delete it rather than leaving it to rot.

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout: mounts <MigrationBanner/> + <Navbar/>, dark bg-[#101827]
│   ├── page.tsx            # Home → MarketsList
│   ├── auth/               # /auth (login+signup, one page), /auth/callback (code exchange), /auth/auth-error
│   ├── markets/            # page.tsx → MarketsList; [id]/page.tsx → market detail (TradeForm + PriceChart)
│   ├── profile/            # page.tsx → THE profile page (auth-gated client-side); PNL, PerformanceRadar, TradeHistory
│   ├── leaderboard/        # → Leaderboard
│   ├── analytics/          # Platform analytics dashboard (aggregate, public)
│   ├── reset-password/     # Password reset
│   └── market_maker/       # Self-contained CPMM/Maniswap calculator (dev playground; no DB writes)
├── components/
│   ├── navbar.tsx          # Responsive nav (mobile hamburger); uses logout-button.tsx
│   ├── logout-button.tsx   # Sign-out control (navbar)
│   ├── MigrationBanner.tsx # Global PayPal/MTurk payout-nudge banner (layout)
│   ├── MarketsList.tsx     # Filterable market list (tags + status) — home, /markets
│   ├── MarketCard.tsx      # Market preview card with odds/volume (MarketsList)
│   ├── TradeForm.tsx       # Core trading UI: buy/sell, validation, preview (/markets/[id])
│   ├── PriceChart.tsx      # Price history chart, Recharts (/markets/[id])
│   ├── PerformanceRadar.tsx# Forecasting-skill radar, D3 SVG (/profile)
│   ├── TradeHistory.tsx    # User trade records; takes a userId prop (/profile)
│   ├── EditProfileModal.tsx# Edit username/payment (/profile)
│   ├── Leaderboard.tsx     # Ranked user list (/leaderboard)
│   └── analytics/          # MarketStats, MarketActivityCharts, UserStatistics,
│                           #   UserActivityCharts, CalibrationChart (all used by /analytics)
├── lib/
│   ├── predictions.ts      # addPrediction() — transactional trade execution (manual rollback)
│   ├── marketMakers.ts     # CPMM + fixed-price market maker algorithms
│   ├── userPerformance.ts  # Per-user forecasting metrics (accuracy/precision/recall/F1/AUC) → PerformanceRadar
│   ├── tradingTypes.ts     # Core interfaces + status helpers (isMarketSettled, isMarketTradable, ...)
│   ├── getMarkets.ts       # Fetch markets (excludes pending)
│   ├── constants.ts        # MARKET_TAGS (Politics, Sports, Culture, Crypto, Economics, ...)
│   └── supabase/           # createClient.ts (default client singleton) + server-client.ts (SSR/RSC/route handlers)
├── middleware.ts           # Guards /account/* (route doesn't exist) + refreshes sessions
└── ...
e2e/                        # Playwright: global-setup.ts (UI login → storageState), *.spec.ts
playwright.config.ts        # Targets PLAYWRIGHT_BASE_URL (defaults to prod Vercel URL)
```

> **Note:** trade validation and currency/share formatting live **inline** in `TradeForm.tsx` + `predictions.ts` — there's no shared `trading.ts`/`formatCurrency` helper anymore (the old one was dead and was removed). Consolidate into a shared helper if you touch this area.

## Orientation (feature → files)

Trace any feature from its route down. This is the live wiring (verified by import graph):

| Route | Renders | Key components | Data / lib |
|-------|---------|----------------|------------|
| `/` and `/markets` | `MarketsList` | `MarketCard` | `getMarkets.ts` (excludes pending) |
| `/markets/[id]` | market detail page | `TradeForm` (imported as `TradingForm`), `PriceChart` | `predictions.ts` (`addPrediction`), `marketMakers.ts`, `tradingTypes.ts` |
| `/profile` | `app/profile/page.tsx` (self-gates on `supabase.auth.getUser()`) | `PerformanceRadar`, `TradeHistory`, `EditProfileModal` | inline PNL calc + `userPerformance.ts` |
| `/leaderboard` | `Leaderboard` | — | reads `leaderboards` table (computed by admin repo) |
| `/analytics` | `app/analytics/page.tsx` | `MarketStats`, `MarketActivityCharts`, `UserStatistics`, `UserActivityCharts`, `CalibrationChart` | queries `profiles`/`markets`/`predictions` directly |
| `/auth`, `/reset-password` | auth pages | — | `supabase.auth.*` |
| global (all pages) | `layout.tsx` | `Navbar`, `MigrationBanner` | — |

**Gotchas when orienting:**
- Market **creation and resolution are not in this repo** — they live in the sibling admin repo. There's no create/manage-market UI here; don't go looking for one.
- Most client components import the default singleton from `lib/supabase/createClient.ts`. SSR/route handlers use `server-client.ts`.
- Supabase caps a `select` at 1000 rows — page with `.range()` when scanning all `predictions` (see `CalibrationChart.tsx` / `userPerformance.ts`).

## User Performance (Forecasting Radar)

`/profile` shows a radar of the user's forecasting skill (`PerformanceRadar` + `lib/userPerformance.ts`).

- **Metrics are classification-based:** accuracy, precision, recall, F1, AUC — **deliberately not Brier/calibration.** A trade only reveals a *minimum* implied probability (buying Yes at 25¢ means P(Yes) > 25%, not the exact belief), so Brier can't measure user skill. (The platform-level `CalibrationChart` still uses Brier — that's market price vs outcome, a different thing.)
- **How:** each resolved market a user traded = one Yes/No forecast (their net-share side vs the winning outcome). Metrics come from the confusion matrix; AUC uses their entry price as a revealed-confidence score. Only resolved markets count.
- **Reuse:** `computeUserPerformance(...)` is a pure function (no Supabase) so the admin repo can run it against the shared DB; `getUserPerformance(userId)` is the fetch wrapper. `PerformanceRadar` takes optional `userId` (defaults to logged-in user) or precomputed `metrics`.
- The radar is a hand-built `viewBox` SVG — scales via CSS with no JS width measurement, and coordinates are rounded to avoid SSR hydration mismatches.

## Database Schema

### Tables

**markets** — Prediction market definitions
- `id` (bigint PK), `name`, `description`, `token_pool`, `market_maker` (CPMM/Maniswap)
- `status` (Market Status enum), `tags` (text[]), `close_date`, `creator_id` → users
- `outcome_id` → outcomes (winning outcome, set on resolution), `resolved_at`

**outcomes** — Possible market results (typically 2 per market: Yes/No)
- `id` (bigint PK), `name`, `tokens` (current pool amount), `market_id` → markets, `creator_id` → users

**predictions** — Every buy/sell trade
- `id` (bigint PK), `user_id` → users, `market_id` → markets, `outcome_id` → outcomes
- `trade_type` (buy/sell), `shares_amt`, `market_odds` (0.0–1.0), `trade_value`

**profiles** (called `users` in schema doc) — User accounts
- `id` (bigint PK), `user_id` (uuid, maps to Supabase Auth), `username`, `email`, `balance`
- `absolute_returns`, `roi`, `payment_method` (Payment Types enum), `payment_id`
- `iq`, `iq_url`, `enable_email_notifications`

**payouts** — Distributed when markets resolve
- `id` (bigint PK), `user_id`, `market_id`, `outcome_id`, `payout_amount`

**leaderboards** — Periodic ranking snapshots
- `id` (bigint PK), `data` (jsonb), `calculation_date`, `total_users`

### Enums
- **Market Status**: pending, open, closed, resolved, annulled
- **Payment Types**: user payment method options

### Key Relationships
```
users.user_id → markets.creator_id, outcomes.creator_id, predictions.user_id, payouts.user_id
markets.id    → outcomes.market_id, predictions.market_id, payouts.market_id
outcomes.id   → predictions.outcome_id, payouts.outcome_id, markets.outcome_id (winning)
```

## Authentication

- **Supabase Auth** with email/password. Sign-up requires email confirmation **when it's enabled in the Supabase dashboard** — with it off, `signUp()` returns a session immediately.
- Auth pages: `/auth` (login **and** signup, toggled in one page), `/auth/callback` (code exchange), `/reset-password`
- **Middleware (`src/middleware.ts`) only matches `/` and `/account/*`** — and `/account` is not a real route, so in practice middleware just refreshes the session. `/profile` is **not** middleware-protected; it self-gates client-side (renders "Loading user data…" until `supabase.auth.getUser()` resolves). `/analytics` and `/leaderboard` are effectively public.
- Auth state via `supabase.auth.getUser()` and `supabase.auth.onAuthStateChange()` listener
- Server client in `src/lib/supabase/server-client.ts`; default client singleton (used by most client components) in `createClient.ts`

## Architecture Patterns

- **No REST API layer** — components query Supabase directly via the JS client
- **Client-heavy** — most components use `"use client"` directive
- **State management** — React hooks only (useState, useEffect, useCallback), no Redux/Zustand
- **Data mutations** — library functions in `src/lib/` (e.g., `addPrediction()`) with manual rollback on failure
- **Supabase queries** — `.from('table').select()`, `.eq()`, `.insert()`, `.update()` patterns
- **Relational joins** — `outcomes!market_id(id, name, tokens)` syntax

## Market Mechanics

### Market Status Lifecycle
`pending` → `open` → `closed` → `resolved` (or `annulled` at any point)
- Pending markets are filtered out at the API level in `getMarkets()`
- Only `open` markets allow trading
- `annulled` markets settle all shares at 50% (0.5 odds)

### Market Maker (CPMM)
- **Constant Product**: `k = outcome1_tokens × outcome2_tokens` (invariant after trades)
- **Probability**: `outcome_tokens / total_tokens` (displayed as percentage)
- **Fixed Price shares**: `shares = amount / probability`
- Binary outcomes only (2 outcomes per market)
- Minimum liquidity: 1 token per outcome pool

### Trade Validation Chain (in order)
1. Market must be `open`
2. User must have sufficient balance (buys) or shares (sells)
3. Trade cannot exceed available market tokens
4. CPMM liquidity must remain above minimum
5. New token balances must stay positive

### Trade Execution (`addPrediction()`)
1. Validate user balance
2. Insert prediction record
3. Update user balance (subtract for buys, add for sells)
4. Update outcome token pool
5. Recalculate market `token_pool` (sum of all outcome tokens)
6. Rollback all steps if any fails

## Coding Conventions

- **Dark theme**: bg-[#101827] (root), bg-[#2C2C2C] (inputs), gray-800/900 (cards)
- **Accent colors**: blue-500/600 (primary), green-500/600 (positive), red-500/600 (negative)
- **Tailwind patterns**: `rounded-lg`, `transition-colors`, mobile-first with `sm:` / `lg:` breakpoints
- **Components**: `"use client"` for interactive components, server components for static/metadata
- **Type definitions**: interfaces in `src/lib/tradingTypes.ts` — Market, Answer, Prediction, Profile, TradePreview, GroupedPrediction, LeaderboardEntry
- **Status helpers**: `isMarketSettled()`, `isMarketTradable()`, `getMarketStatusDisplay()`, `getMarketStatusColorClass()` in tradingTypes.ts (live)
- **Formatting**: `trading.ts` exports `formatShares()`/`formatCurrency()`, but it's **dead** — live components define currency formatting inline (e.g. `Intl.NumberFormat` in `app/profile/page.tsx`). Prefer a shared helper if you consolidate.

## Testing (E2E)

Playwright end-to-end tests live in `e2e/`. Run with `npm run test:e2e`.

- `e2e/global-setup.ts` logs a dedicated test account in **once** through the real `/auth` UI, then persists the browser session to `e2e/.auth/state.json` (gitignored). Every spec reuses that session — no test types a password. It reads `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` from `.env.local`.
- `playwright.config.ts` targets `PLAYWRIGHT_BASE_URL` (defaults to the prod Vercel URL). The test account and DB are shared with prod.
- The test account's `payment_method` must be non-PayPal (or empty) for the `MigrationBanner` spec to render the banner.
- To test locally against a logged-in state, log into that same account — don't sign up fresh accounts (they need email confirmation when it's enabled).

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>    # required to run the app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>  # required; public (shipped to browser)
E2E_TEST_EMAIL=<test account email>                # only for `npm run test:e2e`
E2E_TEST_PASSWORD=<test account password>          # only for `npm run test:e2e`
PLAYWRIGHT_BASE_URL=<url>                           # optional; defaults to prod Vercel URL
```

Stored in `.env.local` (gitignored via `.env*`). The two `NEXT_PUBLIC_*` values are also present in the sibling `../prediction-market-admin/.env.local` (same shared DB) — copy them from there if this repo's `.env.local` has them commented out and the app 500s at SSR.
