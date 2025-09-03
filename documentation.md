# Project TODO

## Requirements
- [ ] R-1 Secure auth & sessions
- [ ] R-2 Event analytics across core flows

## Features (grouped by requirement)
### R-1 Secure auth & sessions
- [ ] F-1.1 Login & Signup UI  (issue #123)
  - [ ] Task: form validation + error states  (issue #201)
  - [ ] Task: invite-only signup gate         (issue #202)
- [ ] F-1.2 Password reset email + token      (issue #124)
  - [ ] Task: request-reset endpoint
  - [ ] Task: verify + reset pages
- [ ] F-1.3 Session hardening (SameSite, rotation) (issue #125)

### R-2 Event analytics
- [ ] F-2.1 Event schema + helpers            (issue #130)
- [ ] F-2.2 Fire events in flows A/B/C        (issue #131)

## Backlog (icebox)
- [ ] “remember me” option

# Architecture

## Custom Types

### Market Status
Enum values: `'open'`, `'closed'`, `'resolved'`, `'annulled'`, `'pending'`

### Payment Types
Enum values: `'PayPal'`, `'MTurk'`

## Schema

### leaderboards
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| data | jsonb | NO |  |  | leaderboard data |
| calculation_date | date | NO |  |  |  |
| total_users | integer | NO |  |  |  |

**Relations:** None

### markets
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| creator_id | uuid | NO |  |  | user who created market |
| name | text | NO |  |  |  |
| description | text | YES |  |  |  |
| token_pool | double precision | NO |  |  |  |
| outcome_id | bigint | YES |  |  | FK to outcomes |
| market_maker | text | NO |  |  |  |
| status | Market Status | NO | 'open' |  | enum type |
| tags | text[] | YES |  |  | array of tags |
| close_date | date | YES |  |  |  |
| link | text | YES |  |  |  |
| target | double precision | YES |  |  |  |

**Relations:** `markets.outcome_id` → `outcomes.id` (FK)

### outcomes
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| market_id | bigint | YES |  |  | FK to markets |
| name | text | YES |  |  |  |
| description | text | YES |  |  |  |
| creator_id | uuid | YES | gen_random_uuid() |  |  |
| tokens | double precision | NO |  |  |  |

**Relations:** `outcomes.id` ← `markets.outcome_id` (FK), `outcomes.market_id` → `markets.id` (FK), `outcomes.id` ← `payouts.outcome_id` (FK), `outcomes.id` ← `predictions.outcome_id` (FK)

### payouts
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| payout_amount | double precision | NO |  |  |  |
| user_id | uuid | NO |  |  |  |
| market_id | bigint | NO |  |  | FK to markets |
| outcome_id | bigint | NO |  |  | FK to outcomes |

**Relations:** `payouts.market_id` → `markets.id` (FK), `payouts.outcome_id` → `outcomes.id` (FK)

### predictions
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| user_id | uuid | YES |  |  |  |
| market_id | bigint | YES |  |  | FK to markets |
| outcome_id | bigint | YES |  |  | FK to outcomes |
| trade_type | text | NO | 'buy' |  |  |
| shares_amt | double precision | YES |  |  |  |
| market_odds | double precision | YES |  |  |  |
| trade_value | double precision | YES |  |  |  |

**Relations:** `predictions.market_id` → `markets.id` (FK), `predictions.outcome_id` → `outcomes.id` (FK)

### profiles
| Column | Type | Null | Default | Index | Notes |
|---|---|---|---|---|---|
| id | bigint | NO | identity | PK | auto-generated |
| created_at | timestamptz | NO | now() |  |  |
| user_id | uuid | YES |  |  |  |
| email | varchar | NO |  |  |  |
| username | text | YES |  |  |  |
| balance | double precision | NO | 1000 |  | starting balance |
| absolute_returns | double precision | YES |  |  |  |
| roi | double precision | YES |  |  |  |
| payment_method | Payment Types | YES |  |  | enum type |
| payment_id | text | YES |  |  |  |
| iq | text | YES |  |  |  |
| iq_url | text | YES |  |  |  |
| enable_email_notifications | boolean | YES | false |  |  |

**Relations:** None

## Directory map (one-liners)
| Dir | Role | Notes |
|---|---|---|
| `src/app/` | [UI] Next.js app router pages | Routes, layouts, and page components |
| `src/components/` | [UI] Reusable React components | Trading forms, charts, UI elements |
| `src/lib/` | [Domain] Business logic & utilities | Market makers, predictions, types |
| `public/` | [Static] Static assets | SVG icons and images |
| `utils/` | [Utils] Legacy Supabase utilities | Deprecated in favor of src/lib/supabase |

## Module catalog (single line per non-trivial file)
| Path | Role | Key deps | Owner | Tests |
|---|---|---|---|---|
| `src/app/page.tsx` | home page UI | `MarketsList` | - | - |
| `src/app/markets/[id]/page.tsx` | market details & trading | `TradeForm`, `PriceChart` | - | - |
| `src/app/profile/page.tsx` | user dashboard | `TradeHistory`, PNL calc | - | - |
| `src/app/leaderboard/page.tsx` | rankings display | `Leaderboard` component | - | - |
| `src/app/analytics/page.tsx` | platform analytics | analytics components | - | - |
| `src/app/auth/page.tsx` | login/signup UI | Supabase auth | - | - |
| `src/components/TradeForm.tsx` | core trading interface | market makers, predictions | - | - |
| `src/components/MarketCard.tsx` | market preview cards | market data, price changes | - | - |
| `src/components/PriceChart.tsx` | market probability charts | recharts, predictions | - | - |
| `src/components/Leaderboard.tsx` | user rankings table | Supabase leaderboards | - | - |
| `src/components/navbar.tsx` | site navigation | auth state, routing | - | - |
| `src/lib/marketMakers.ts` | CPMM & fixed price algorithms | pure math functions | - | - |
| `src/lib/predictions.ts` | trade execution logic | Supabase, balance updates | - | - |
| `src/lib/getMarkets.ts` | market data fetching | Supabase markets/outcomes | - | - |
| `src/lib/trading.ts` | trade validation & utilities | market makers, Supabase | - | - |
| `src/lib/supabase/createClient.ts` | database client | Supabase SDK | - | - |

## Top flows (human-level)
1. **User Registration:** `auth/page.tsx` → Supabase auth → profile creation → dashboard redirect
2. **Market Trading:** `markets/[id]` → `TradeForm` → validate balance/shares → execute trade → update tokens
3. **Market Creation:** Admin creates market → outcomes defined → CPMM pools initialized → market goes live
4. **Market Resolution:** Admin selects winning outcome → payouts calculated → user balances updated
5. **View Analytics:** `analytics/page.tsx` → fetch prediction/user data → render charts → time-filtered views