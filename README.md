# Prophet V3: Prediction Market Platform

## Project Overview

Prophet V3 is a web-based prediction market platform where users can trade on the outcomes of future events. The platform uses automated market makers to facilitate trading and price discovery without requiring traditional order books.

## Key Features

- **Binary Markets**: Users can create and trade on binary outcome markets (typically Yes/No questions)
- **Automated Market Making**: Uses Constant Product Market Maker (CPMM) algorithm to determine prices
- **User Authentication**: Complete login/signup flow with Supabase authentication
- **User Profiles**: Personal dashboards showing trading history and portfolio performance
- **PNL Tracking**: Tracks profit and loss for users across all markets
- **Market Creation**: Interface for users to create new prediction markets

## Technical Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: TailwindCSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Ready for Vercel deployment

## Project Structure

- `/src/app`: Next.js app router pages
- `/src/components`: Reusable React components 
- `/src/lib`: Utility functions and business logic
  - `/lib/marketMakers.ts`: Implementation of market maker algorithms
  - `/lib/predictions.ts`: Trading functionality
  - `/lib/calculatePNL.ts`: Profit and loss calculations
- `/public`: Static assets

## Core Concepts

### Market Makers

The platform currently implements a Constant Product Market Maker (CPMM) similar to Uniswap, where:
- The product of token pools remains constant (x * y = k)
- Trades change the ratio between token pools, which changes the price
- The market maker automatically adjusts prices based on supply and demand

### Trading Mechanism

1. Users choose a market and select an outcome (e.g., "Yes" or "No")
2. Users specify how much they want to spend
3. The CPMM algorithm calculates how many outcome shares they receive
4. If the chosen outcome occurs, shares are worth $1 each; if not, they're worth $0

### Market Resolution

When events resolve, market creators can select the winning outcome and users' positions are settled accordingly.

## Current Development Status

- Core market creation functionality is implemented
- Trading interface for buying and selling positions is working
- User authentication and profiles are functional
- Market list and details pages are complete
- PNL calculation is implemented but needs refinement

## Next Steps

- Improve market resolution mechanism
- Add market categories and search functionality 
- Implement admin panel for market management
- Add liquidity provider incentives
- Create mobile-responsive design improvements
- Implement on-chain settlement (optional)

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up a Supabase project and configure environment variables
4. Run the development server with `npm run dev`
5. Navigate to `http://localhost:3000`

## Database Schema

### Main Tables
- `markets`: Stores market metadata (name, description, token pool, etc.)
- `outcomes`: Stores outcomes for each market (Yes/No options)
- `predictions`: Records user trades
- `profiles`: Stores user profiles and balances

## Market Types

Currently, the platform supports:
- Binary markets (Yes/No outcomes)
- Future development may include scalar and categorical markets

## Important Notes

- The platform uses simulated currency and is intended for educational and entertainment purposes
- The current system architecture prioritizes simplicity over scaling to very high transaction volumes