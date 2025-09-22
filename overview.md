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
    - **Collective Intelligence**: the result of proper aggregation of local information in generating a global solution to a problem that is more optimal than what any individual could have provided. It's not just the product of group opinions, but is instead a weighed and calibrated end-product of an information exchange between a group of thinkers. The four conditions that enable the emergence of collective intelligence in a crowd:
        - Diversity of opinion: each person should have some private information, even if it's just an eccentric intrepretation of the known facts.
        - Independence: people's opinions are not determined by the opinions of those around them
        - Decentralization: people are able to specialize and draw on local knowledge
        - Aggregation: some mechanism exists for turning private judgement into a collective decision
    - Participants are more thoughtful with their actions in a prediction market since there is a money involved.
- Prediction markets succeed because their nature supports all 4 factors.

## Challenges and Limitations of Prediction Markets
- Prior research has identified three major types of errors in prediction markets
    - Sampling error: Everyone's contributing information that seems reasonable to them, but because everyone's information is flawed or incomplete in similar ways, the crowd guess gets worse instead of better
    - Market-maker bias: mathematical formula used to set prices can accidentally push people to bet one way or another, even when that's not what they actually believe.
    - Convergence error: At any moment you check, the market price might be wrong not because people are dumb or biased, but simply because the market is still "figuring itself out" and hasn't reached its stable, final answer yet.

# Price Discovery
- Price discovery is the process through which the prices of contracts or shares related to the outcomes of events are determined through the analysis of market data, ensuring dair and efficient prices.

- Takes into account opinions, actions, and decisions of market participants unlike AMMs who determine the price of contracts based on supply and demand dynamics.

- It generates a price that is fair for both the seller and buyer of the contract

# Glossary
- **Automated Market Maker (AMM)**: Algorithms or smart contracts that provide liquidity and facilitate trading in decentralized markets by adjusting prices based on supply and demand dynamics. They can calculate prices of contracts. 
- **Liquidity**: The ease at which participants can buy and sell contracts or shares related to the outcomes of events. A prediction market with high liquidity means that there are a large number of participants actively trading contracts, which allows for smooth and efficient transactions at fair prices.
- **Market Maker**: A participant or entity that provides liquidity by offering to buy and sell contracts or shares. Market makers play a crucial role in  ensuring that there is a continuous flow of trading activity in the market, which helps maintain liquidity and efficiency. 
- **Price Discovery**: The process by which the prices of contracts or shares related to the outcomes of events are determined based on the collective wisdom and trading activity of participants.