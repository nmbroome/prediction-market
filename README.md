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

- `/src/app`: Next.js app router pages
- `/src/components`: Reusable React components 
- `/src/lib`: Utility functions and business logic
  - `/lib/marketMakers.ts`: Implementation of market maker algorithms
  - `/lib/predictions.ts`: Trading functionality
  - `/lib/calculatePNL.ts`: Profit and loss calculations
- `/public`: Static assets

## Roadmap

- Improve market resolution mechanism
- Add market categories and search functionality 
- Implement admin panel for market management
- Add liquidity provider incentives
- Create mobile-responsive design improvements
- Implement on-chain settlement (optional)

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

### April 1, 2025
- Core market creation functionality is implemented
- Trading interface for buying and selling positions is working
- User authentication and profiles are functional
- Market list and details pages are complete
- PNL calculation is implemented but needs refinement

### April 2, 2025
- [Current development in progress]