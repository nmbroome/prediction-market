/**
 * Trading-related type definitions for the prediction market platform
 */

export interface Market {
  id: number;
  name: string;
  description: string;
  token_pool: number;
  market_maker: string;
  status?: 'pending' | 'open' | 'closed' | 'resolved' | 'annulled'; // Updated to include 'annulled'
  close_date?: string;
  created_at?: string;
  creator_id?: string;
  tags?: string[];
  outcome_id?: number | null;
}

export interface Answer {
  id: number;
  name: string;
  tokens: number;
  market_id: number;
  created_at?: string;
  creator_id?: string;
}

export interface WinningOutcome {
  id: number;
  name: string;
}

export interface MarketWithResolution extends Market {
  outcomes?: Answer[];
  winning_outcome?: WinningOutcome | null;
}

export interface TradePreview {
  sharesReceived: number;
  avgPrice: number;
  priceImpact: number;
  newOdds: number;
  expectedProfit: number;
  isValid: boolean;
  error: string | null;
}

export interface UserBalance {
  balance: number;
  user_id: string;
}

export interface UserShares {
  [outcomeId: number]: number;
}

export interface TradeValidationResult {
  isValid: boolean;
  reason?: string;
  error?: string;
  details?: {
    userBalance?: number;
    userShares?: number;
    requiredAmount?: number;
    availableShares?: number;
  };
}

export interface Prediction {
  id?: number;
  predictionId?: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  market_odds: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
  created_at?: string;
  market?: Market;
  outcome?: Answer;
  outcomes?: Answer[];
}

export interface Profile {
  id: string;
  user_id: string;
  username?: string;
  email?: string;
  balance?: number;
  payment_id?: string | null;
  enable_email_notifications?: boolean;
  created_at?: string;
  absolute_returns?: number;
  roi?: number;
  payment_method?: string;
  iq?: number;
  iq_url?: string;
}

export interface Outcome {
  id: number;
  name: string;
  tokens: number;
  market_id?: number;
  created_at?: string;
  creator_id?: string;
}

export interface PnlMetrics {
  totalPNL: number;
  percentageChange: number;
  volumeTraded: number;
  marketsTraded: number;
}

export interface GroupedPrediction {
  market_id: number;
  market_name: string;
  outcome_id: number;
  outcome_name: string;
  total_shares: number;
  total_value: number;
  current_odds: number;
  market_status: 'open' | 'closed' | 'resolved' | 'annulled'; // Updated to include 'annulled'
  last_trade_date: string;
  predictions: Prediction[];
}

export interface LeaderboardEntry {
  user_id: string;
  username?: string;
  payment_id?: string | null;
  total_profit: number;
  percent_pnl: number;
  balance: number;
}

// Utility types for API responses
export interface MarketWithOutcomes extends Market {
  outcomes: Outcome[];
}

export interface PredictionWithDetails {
  id?: number;
  predictionId?: number;
  user_id: string;
  market_id: number;
  outcome_id: number;
  shares_amt: number;
  market_odds: number;
  trade_value: number;
  trade_type: 'buy' | 'sell';
  created_at?: string;
  market: Market;
  outcome: Outcome;
  outcomes: Outcome[];
}

// Form-specific types
export interface TradeFormState {
  market: Market | null;
  answers: Answer[];
  totalPrice: number;
  computedShares: number;
  selectedAnswer: Answer | null;
  tradeType: 'buy' | 'sell';
  userBalance: number;
  userShares: UserShares;
  error: string | null;
  success: string | null;
}

export interface TradeFormProps {
  marketId?: number;
  onTradeComplete?: (trade: Prediction) => void;
  initialTradeType?: 'buy' | 'sell';
}

// Price change data for market cards
export interface PriceChangeData {
  currentPrice: number;
  previousPrice: number;
  changeAmount: number;
  changePercentage: number;
  hasData: boolean;
}

// Market odds for charts
export interface MarketOdds {
  timestamp: string;
  probability: number;
  shares_amt: number;
  trade_type: 'buy' | 'sell';
  outcome_name: string;
}

// Market card props with resolution support
export interface MarketCardProps {
  id: number;
  name: string;
  outcomes?: Array<{
    id: number;
    name: string;
    tokens: number;
  }>;
  status?: 'pending' | 'open' | 'closed' | 'resolved' | 'annulled'; // Updated to include 'annulled'
  winning_outcome?: WinningOutcome | null;
}

// Market resolution status helper types
export type MarketResolutionStatus = 'pending' | 'open' | 'closed' | 'resolved' | 'annulled'; // Updated to include 'annulled'

export interface ResolvedMarket extends Market {
  outcome_id: number;
  winning_outcome: WinningOutcome;
  status: 'resolved'; // Updated from 'closed' to 'resolved'
}

// New interface for annulled markets
export interface AnnulledMarket extends Market {
  status: 'annulled';
  settlement_odds: number; // Should be 0.5 for 50% settlement
}

// Helper function to check if a market is settled (resolved or annulled)
export function isMarketSettled(market: Market): boolean {
  return market.status === 'resolved' || market.status === 'annulled';
}

// Helper function to get settlement value for annulled markets
export function getAnnulledSettlementOdds(): number {
  return 0.5; // 50% or 50¢ per share
}

// Helper function to determine if a market can be traded
export function isMarketTradable(market: Market): boolean {
  return market.status === 'open';
}

// Helper function to get market status display text
export function getMarketStatusDisplay(market: Market): string {
  switch (market.status) {
    case 'pending':
      return 'Pending';
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    case 'resolved':
      return 'Resolved';
    case 'annulled':
      return 'Annulled';
    default:
      return 'Unknown';
  }
}

// Helper function to get market status color class
export function getMarketStatusColorClass(market: Market): string {
  switch (market.status) {
    case 'pending':
      return 'bg-yellow-900 text-yellow-200';
    case 'open':
      return 'bg-green-900 text-green-200';
    case 'closed':
      return 'bg-red-900 text-red-200';
    case 'resolved':
      return 'bg-blue-900 text-blue-200';
    case 'annulled':
      return 'bg-yellow-900 text-yellow-200';
    default:
      return 'bg-gray-900 text-gray-200';
  }
}