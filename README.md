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
- [ ] Pull market and outcome name in trade history
- [ ] Fix status on trade history
- [ ] Update predictions schema to store type of trade(buy/sell)
- [ ] Add price charts to markets
- [ ] Make sure market annullment settles at initial market odds
- [ ] Systematize CSS to make it more object oriented
- [ ] Add combinatorial markets
- [ ] Add scalar markets
- [ ] Add additional market maker algorithms
    - [ ] DPM - Dyanmic Parimutual
    - [ ] LMSR - Logarithmic Market scoring rules
    - [ ] Maniswap
    - [ ] pm-AMM https://www.paradigm.xyz/2024/11/pm-amm
- [ ] Add multiple choice markets
- [ ] Show the user how the odds change prior to the trade
- [ ] Show leaderboard changes
- [ ] Calibration page (https://manifold.markets/calibration)
- [ ] Recurring markets
- [ ] Verify PNL calculations when a user adds to their position
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
| return_amt | Amount of outcome shares received |
| user_id | User who made the prediction |
| market_id | Market the prediction was made on |
| created_at | Timestamp of the prediction |
| outcome_id | The outcome that was predicted |
| predict_amt | Amount of currency spent on the prediction |
| buy_price | Price at time of purchase |
| sell_price | Price at time of sale (if applicable) |

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

## Development Status

### April 2, 2025
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