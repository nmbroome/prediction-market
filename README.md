# Prophet V3: Prediction Market Platform

## Project Overview

Prophet V3 is a web-based prediction market platform where users can trade on the outcomes of future events. The platform uses automated market makers to facilitate trading and price discovery without requiring traditional order books.

## Key Features

### Binary Markets
Users can create and trade on binary outcome markets (typically Yes/No questions):
1. Users choose a market and select an outcome (e.g., "Yes" or "No")
2. Users specify how much they want to spend
3. The CPMM algorithm calculates how many outcome shares they receive
4. If the chosen outcome occurs, shares are worth $1 each; if not, they're worth $0
5. When events resolve, market creators can select the winning outcome and users' positions are settled accordingly

### Automated Market Making
Uses Constant Product Market Maker (CPMM) algorithm to determine prices:
- The product of token pools remains constant (x * y = k)
- Trades change the ratio between token pools, which changes the price
- The market maker automatically adjusts prices based on supply and demand

### Additional Features
- **User Authentication**: Complete login/signup flow with Supabase authentication
- **User Profiles**: Personal dashboards showing trading history and portfolio performance
- **PNL Tracking**: Tracks profit and loss for users across all markets
- **Market Creation**: Interface for users to create new prediction markets

## Project Structure

### Frontend Structure
- `/src/app`: Next.js app router pages and routes
  - `/app/page.tsx`: Main landing page showing markets list
  - `/app/markets`: Markets browsing pages
    - `/app/markets/[id]/page.tsx`: Individual market details and trading interface
  - `/app/profile/page.tsx`: User profile dashboard 
  - `/app/market_maker/page.tsx`: Testing page for market maker algorithms
  - `/app/auth`: Authentication-related pages
    - `/app/auth/callback/route.ts`: OAuth callback route
    - `/app/auth/auth-error/page.tsx`: Error handling for auth
  - `/app/login` & `/app/signup`: User authentication pages
  - `/app/layout.tsx`: Root layout with global styling and navigation

### Components
- `/src/components`: Reusable React components
  - `TradeForm.tsx`: Core trading interface for buying/selling shares
  - `MarketsList.tsx`: Displays filterable list of available markets
  - `MarketCard.tsx`: Card component for market preview
  - `CreateMarket.tsx`: Form for creating new prediction markets
  - `CPMM.tsx`: Component handling constant product market maker logic
  - `TradeHistory.tsx`: Displays user's trading history
  - `EditProfileModal.tsx`: Modal for profile editing
  - `PredictionHistory.tsx`: Component for viewing prediction history
  - `Leaderboard.tsx`: Displays user rankings
  - `navbar.tsx`: Site-wide navigation component
  - Authentication components:
    - `login-button.tsx` & `logout-button.tsx`: Authentication controls

### Business Logic
- `/src/lib`: Utility functions and business logic
  - `/lib/marketMakers.ts`: Implementation of market maker algorithms
    - `constantProductMarketMaker()`: Core function for CPMM calculations
  - `/lib/predictions.ts`: Trading functionality
    - `addPrediction()`: Handles trade execution and database updates
  - `/lib/calculatePNL.ts`: Profit and loss calculations
  - `/lib/addMarket.ts`: Functions for creating new markets
  - `/lib/addAnswers.ts`: Functions for adding outcomes to markets
  - `/lib/getMarkets.ts`: Functions for retrieving market data
  - `/lib/constants.ts`: Application-wide constants like market tags
  - `/lib/types.ts`: TypeScript type definitions
  - `/lib/supabase`: Supabase client initialization
    - `browser-client.ts`: Client for browser environment
    - `server-client.ts`: Client for server environment
    - `createClient.ts`: General client creation

### Static Assets
- `/public`: Static assets
  - SVG icons: `file.svg`, `globe.svg`, `window.svg`, etc.

### Middleware and Configuration
- `/src/middleware.ts`: Next.js middleware for route protection
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `postcss.config.mjs`: PostCSS configuration
- `tsconfig.json`: TypeScript configuration

## Roadmap

- [x] Update volume traded and markets traded on profile
- [x] Pull market and outcome name in trade history
- [x] Fix status on trade history
- [x] Update predictions schema to store type of trade(buy/sell)
- [x] Verify PNL calculations when a user adds to their position
- [x] Show the user how the odds change prior to the trade
- [x] Collapse trades of same outcome in trade history
- [x] Make sure market annullment settles at initial market odds
- [x] Fix potential returns on trade form
- [x] Add ability to change workerID on profile
- [x] Add price charts to markets
- [x] Add leaderboard page
- [ ] Recurring markets
- [ ] Systematize CSS to make it more object oriented
- [ ] Add combinatorial markets
- [ ] Add scalar markets
- [ ] Add additional market maker algorithms
    - [ ] DPM - Dyanmic Parimutual
    - [ ] LMSR - Logarithmic Market scoring rules
    - [ ] Maniswap
    - [ ] pm-AMM https://www.paradigm.xyz/2024/11/pm-amm
- [ ] Add multiple choice markets
- [ ] Show leaderboard changes
- [ ] Calibration page (https://manifold.markets/calibration)
- [ ] Conditional Tokens
- [ ] Second order forecasting markets
    - How much will the forecasts for US GDP in 2024 and 2025 be correlated over the next year?
    - How many forecasts will the question "What will be the GDP of the US in 2024?" receive in total?
    - If the question "What is the chance that a Republican will win the 2028 Presidential Election?" was posted to Manifold, with a subsidy of 100k Mana, what would the prediction be, after 1 month?"

## Database Schema

### Markets
| Field | Description |
|-------|-------------|
| id | Unique identifier for the market |
| name | Market name/title |
| description | Detailed description of the market |
| created_at | Timestamp when market was created |
| creator_id | ID of the user who created the market |
| tokens | Total token count in the market |
| auth.users.id | Foreign key relationship to users |

### Outcomes
| Field | Description |
|-------|-------------|
| id | Unique identifier for the outcome |
| name | Outcome name (typically "Yes" or "No") |
| market_id | Foreign key to markets table |
| created_at | Timestamp when outcome was created |
| tokens | Token count allocated to this outcome |

### Predictions
| Field | Description |
|-------|-------------|
| id | Unique identifier for the prediction (trade) |
| user_id | User who made the prediction |
| market_id | Market the prediction was made on |
| created_at | Timestamp of the prediction |
| outcome_id | The outcome that was predicted |
| shares_amt | Amount of outcome shares traded (bought or sold) |
| market_odds | Market odds at the time of the trade |
| trade_value | Value of the trade (negative for buys, positive for sells) |
| trade_type | Type of trade ("buy" or "sell") |

### Profiles
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| enable_email_notifications | User preference for email notifications |
| created_at | Account creation timestamp |
| user_id | Reference to auth.users |
| username | User's display name |
| balance | User's current balance |
| absolute_returns | Total returns in absolute terms |
| roi | Return on investment percentage |
| payment_method | User's payment method preference (PayPal/MTurk) |
| payment_id | Payment identifier |
| iq | User IQ score (possibly for research purposes) |
| email | User's email address |
| iq_url | URL related to IQ test |

### Leaderboards
| Field | Description |
|-------|-------------|
| created_at | Timestamp for leaderboard entry |
| iq | IQ score |
| user_id | User reference |

### Payouts
| Field | Description |
|-------|-------------|
| id | Unique identifier for the payout record |
| user_id | Reference to the user receiving the payout |
| market_id | Reference to the market the payout is for |
| outcome_id | Reference to the winning outcome |
| payout_amount | Amount of the payout in dollars/credits |
| created_at | Timestamp when the payout was processed |

## Development Status

### June 2, 2025
- Begin separating functions from components into /lib

### April 23, 2025
- Add ability to edit worker ID on profile page

### April 20, 2025
- Add price charts on market details page

### April 15, 2025
- Add grouped trade history component

### April 9, 2025
- Fix rounding error with displaying and selling shares
- Add sell all button to trade form

### April 8, 2025
- Update prediction schema to simplify logic

### April 7, 2025
- Update TradeHistory.tsx to display names of markets and outcomes instead of ID
- Update TradeHistory.tsx to show market status correctly

### April 3, 2025
- Update MarketCard.tsx to display total market volume and number of trades
- Remove placeholder values from TradeForm.tsx

### April 2, 2025
- Update readme to provide better context to LLMs

### April 1, 2025
- Core market creation functionality is implemented
- Trading interface for buying and selling positions is working
- User authentication and profiles are functional
- Market list and details pages are complete
- PNL calculation is implemented but needs refinement