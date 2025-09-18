# Project Overview
- Prophet is a web-based prediction market platform that enables users to create and trade events. The platform solves the challenges of price discovery for uncertain events through prediction markets. Users create markets with outcomes (e.g., YES/NO), trade shares using market makers, and settle positions upon resolution. Key elements include:
    - Binary/multi-outcome markets with automated liquidity via CPMM or fixed-price makers
    - Real-time trading previews, validations, and PNL calculations
    - User dashboards for profiles, trade history, and performance metrics
    - Analytics for platform growth and market activity
    - Resolution by creators, with payouts based on winning outcomes


# Prediction Markets Overview
## What is a Prediction Market?
- a **prediction market** is a type of market where participants can buy and sell **contracts** based on the outcome of future events. These events can range from political elections to sports games to the weather.
### What's a Contract?
- A **contract** refers to a financial instrument that represents a prediction of bet on the outcome of a future event. Participants in a prediction market can buy and sell these contracts,  which are typically binary options with a fixed payout based on the outcome of the event.

### In plain english:
A contract is like betting on the outcome of a future event. For example, in a prediction market for a sports game, you could buy a contract that pays out if your team wins.

## Pricing
- Contracts: The price of a contract will go up or down based on how likely people think an event will or will not happen
    - The highest price is $1. If price is $1 that means that market believes it is guaranteed to happen. $0.30 price means that the market is estimating the probability of the event happening is 30%.

- Payouts: In prediction markets, the payout for a contract is typically a set price determined when the contract is created.
    - Ways to profit:
        - Buy low, sell high: One common strategy is to buy contracts at a low price and sell them at a higher price. This involves predicting the outcome of an event accurately and purchasing contracts when they're undervalued, then selling them whenever their prices increases. (In other words, betting on an event while market still has low confidence in it happening and selling once the market confidence increases.)
        - Arbitrage: Arbitrage involves taking advantage of price differences for the same contract on different platforms or markets. By buying a contract at a lower price on one platform and selling it at a higher price on another, you can profit from the price differential.
        - Hedging: Hedging involves placing bets on multiple outcomes of an event to reduce risk and potentially secure a profit regardless of the outcome. By strategically buying contracts for different outcomes, you can minimize losses and potentially make profit
        - Information advantage: If you have access to information or insight that gies you an edge in predicting the outcome of an event, you can use this advantage to make profitable trades in the prediction market
        - Market timing: Timing your trades on market trends, new events, or changes in sentiment can also help you make a profit in a prediction market. By monitoring market dynamics and making strategic trades at the right time, you can capitalize on price movement and maximize your returns.


## Why Prediction Markets?
 - "Turns out the predictions created by prediction markets are more accurate than than experts themselves ... even though the people themselves participating in the market are amateurs" - Lorenzo
    - Collective Intelligence utilizes  for more cognitive diversity
    - Participants are more thoughtful with their actions in a prediction market since there is a money involved.


# Price Discovery
- Price discovery is the process through which the prices of contracts or shares related to the outcomes of events are determined through the analysis of market data, ensuring dair and efficient prices.

- Takes into account opinions, actions, and decisions of market participants unlike AMMs who determine the price of contracts based on supply and demand dynamics.

- It generates a price that is fair for both the seller and buyer of the contract

