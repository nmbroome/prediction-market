# Prediction Market Platform

Binary prediction market platform where users create markets, trade on outcomes, and receive payouts when markets resolve. Uses an automated market maker (CPMM) for pricing.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19 RC
- **Language**: TypeScript 5 (strict mode, path alias `@/*` → `./src/*`)
- **Database & Auth**: Supabase (PostgreSQL + Auth with email/password)
- **Styling**: Tailwind CSS 3.4 (dark theme)
- **Charts**: Recharts
- **Deployment**: Vercel

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (Navbar, dark theme bg-[#101827])
│   ├── page.tsx            # Home → MarketsList
│   ├── auth/               # Login/signup page + callback route
│   ├── markets/            # Markets list + /[id] detail page
│   ├── profile/            # User profile + trade history
│   ├── leaderboard/        # User rankings
│   ├── analytics/          # Platform analytics dashboard
│   ├── reset-password/     # Password reset
│   └── market_maker/       # Market maker testing page
├── components/             # React components
│   ├── TradeForm.tsx       # Core trading UI (buy/sell, validation, preview)
│   ├── MarketCard.tsx      # Market preview card with odds/volume
│   ├── MarketsList.tsx     # Filterable market list (tags + status)
│   ├── PriceChart.tsx      # Price history chart (Recharts)
│   ├── CreateMarket.tsx    # Market creation form
│   ├── ManageMarket.tsx    # Market admin interface
│   ├── Profile.tsx         # User profile display
│   ├── EditProfileModal.tsx
│   ├── Leaderboard.tsx     # Ranked user list
│   ├── TradeHistory.tsx    # User trade records
│   ├── GroupedTradeHistory.tsx
│   ├── PredictionHistory.tsx
│   ├── navbar.tsx          # Responsive nav (mobile hamburger)
│   ├── Onboarding.tsx      # New user onboarding
│   └── analytics/          # Analytics sub-components (charts, stats)
├── lib/                    # Business logic & utilities
│   ├── trading.ts          # Trade validation, balance/share checks, previews
│   ├── predictions.ts      # addPrediction() — transactional trade execution
│   ├── marketMakers.ts     # CPMM + fixed price market maker algorithms
│   ├── tradingTypes.ts     # Core TypeScript interfaces (Market, Answer, Prediction, etc.)
│   ├── types.ts            # Legacy type definitions
│   ├── getMarkets.ts       # Fetch markets (excludes pending)
│   ├── addMarket.ts        # Insert new market
│   ├── addAnswers.ts       # Insert market outcomes
│   ├── calculatePNL.ts     # Profit/loss calculations
│   ├── constants.ts        # MARKET_TAGS (Politics, Sports, Culture, Crypto, etc.)
│   └── supabase/           # Supabase client setup
│       ├── browser-client.ts   # Client-side Supabase client
│       ├── server-client.ts    # Server-side client (SSR, server components, route handlers)
│       └── createClient.ts     # Basic client (legacy)
└── middleware.ts           # Protects /account routes, refreshes sessions
```

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

- **Supabase Auth** with email/password (sign up requires email confirmation)
- Auth pages: `/auth` (login/signup), `/auth/callback` (code exchange), `/reset-password`
- Middleware (`src/middleware.ts`) protects `/account` routes, redirects unauthenticated users
- Auth state via `supabase.auth.getUser()` and `supabase.auth.onAuthStateChange()` listener
- Server client in `src/lib/supabase/server-client.ts`, browser client in `browser-client.ts`

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
- **Status helpers**: `isMarketSettled()`, `isMarketTradable()`, `getMarketStatusDisplay()`, `getMarketStatusColorClass()` in tradingTypes.ts
- **Formatting**: `formatShares()`, `formatCurrency()` in trading.ts

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Stored in `.env.local` (gitignored). Both are required for development.
