// Legacy types - keeping for backward compatibility
export type Markets = {
  marketId: number;
  marketName: string;
  description: string;
  tokenPool: string;
  marketMaker: string;
  outcome: string;
};

export type Predictions = {
predictionId: number;
marketName: string;
outcome: string;
predictAmount: number;
returnAmount: number;
buy_price: number;
};