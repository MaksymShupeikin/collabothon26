export type MiniGame = "basket" | "eggs" | "bucket" | "snowball";
export type Concept = {
  id: string; world: number; title: string; sentence: string; example: string;
  game: string; minigame?: MiniGame;
  quiz: { q: string; options: string[]; answer: number };
};

/** XP for collecting a concept card (correct quiz answer). */
export const QUIZ_XP = 25;

export const WORLDS = [
  { n: 1, title: "Basics", boss: null },
  { n: 2, title: "Trading mechanics", boss: "dan" },
  { n: 3, title: "Risk & return", boss: "alex" },
  { n: 4, title: "Time & growth", boss: "paula" },
  { n: 5, title: "Reading the market", boss: "hanna" },
] as const;

export const CONCEPTS: Concept[] = [
  // World 1
  { id: "stock", world: 1, title: "Stock", sentence: "A stock is a small piece of a company.", example: "SAP has about 1.2 billion shares. Buy one and you own a tiny slice of SAP.", game: "Slice the pizza",
    quiz: { q: "You buy 1 share of Siemens. What do you own?", options: ["A loan to Siemens", "A tiny piece of Siemens", "A Siemens product voucher"], answer: 1 } },
  { id: "bond", world: 1, title: "Bond", sentence: "With a bond you lend money and get interest back.", example: "Lend 1,000 € at 3% for 5 years → 30 € interest every year, 1,000 € back at the end.", game: "Lend & collect",
    quiz: { q: "What do you usually get from a bond?", options: ["Fixed interest", "A vote at the AGM", "A share of every product sold"], answer: 0 } },
  { id: "etf", world: 1, title: "ETF", sentence: "An ETF is a basket of hundreds of companies in one purchase.", example: "100 € in an MSCI World ETF spreads across ~1,400 companies — Apple, Microsoft, NVIDIA and more.", game: "Fill the basket", minigame: "basket",
    quiz: { q: "One company in your MSCI World ETF crashes 50%. Your ETF…", options: ["Falls about 50%", "Barely moves", "Is closed"], answer: 1 } },
  { id: "dividend", world: 1, title: "Dividend", sentence: "A dividend is a part of the profit paid out to shareholders.", example: "Allianz pays a dividend per share once a year. 10 shares → 10× the dividend into your account.", game: "Payday",
    quiz: { q: "Who receives the dividend?", options: ["Only employees", "Everyone who owns the shares", "Only the bank"], answer: 1 } },
  { id: "market-cap", world: 1, title: "Market cap", sentence: "Market cap = share price × number of shares — the company's price tag.", example: "Price 30 € × 5 billion shares = 150 billion € market cap.", game: "Guess the giant",
    quiz: { q: "Company A: 10 € × 10bn shares. Company B: 500 € × 100m shares. Which is bigger?", options: ["A (100bn)", "B (50bn)", "Same size"], answer: 0 } },
  // World 2
  { id: "spread", world: 2, title: "Bid / Ask / Spread", sentence: "The buy price is a bit higher than the sell price — the gap is the spread, and it costs you.", example: "Ask 100.10 €, bid 99.90 € → buy and sell right away and you lose 0.20 € per share.", game: "Market stall",
    quiz: { q: "You buy at the ask and immediately sell at the bid. You…", options: ["Break even", "Lose the spread", "Earn the spread"], answer: 1 } },
  { id: "market-order", world: 2, title: "Market order", sentence: "A market order buys now, at whatever the current price is.", example: "Fast, but in a jumpy market you might pay more than the price you saw.", game: "Speed round",
    quiz: { q: "What does a market order guarantee?", options: ["The price", "Execution", "Profit"], answer: 1 } },
  { id: "limit-order", world: 2, title: "Limit order", sentence: "A limit order buys only at your price or better.", example: "Limit 120 € → the order fills only if the price drops to 120 € or below.", game: "Set the trap",
    quiz: { q: "Limit buy at 50 €, price is 55 €. What happens?", options: ["Buys at 55 €", "Waits until 50 € or lower", "Cancels instantly"], answer: 1 } },
  { id: "stop-loss", world: 2, title: "Stop-loss", sentence: "A stop-loss sells automatically if the price falls to a level you set.", example: "Bought at 100 €, stop at 90 € → you lose at most about 10% (plus gaps).", game: "Safety net",
    quiz: { q: "Why set a stop-loss?", options: ["To limit losses", "To pay lower fees", "To get dividends"], answer: 0 } },
  { id: "fees", world: 2, title: "Fees & TER", sentence: "Every trade costs an order fee, and every fund charges a yearly fee (TER).", example: "14 trades × ~5 € = 70 € gone. A 1.8% TER vs 0.2% can cost thousands over 30 years.", game: "Leaky bucket", minigame: "bucket",
    quiz: { q: "Which costs you more over 30 years?", options: ["TER 0.2%", "TER 1.8%", "No difference"], answer: 1 } },
  { id: "trading-hours", world: 2, title: "Trading hours", sentence: "Outside main exchange hours fewer people trade, so spreads get wider.", example: "The same order at 14:00 and at 22:00 can cost you a different price.", game: "Night market",
    quiz: { q: "When are spreads usually widest?", options: ["Midday on a weekday", "Late at night", "They never change"], answer: 1 } },
  // World 3
  { id: "risk-return", world: 3, title: "Risk vs. return", sentence: "Higher possible gains always come with higher possible losses.", example: "Savings account: ~2%, almost no risk. Single tech stock: +80% or −50% in a year.", game: "The slider",
    quiz: { q: "An offer promises 20% a year with no risk. That's…", options: ["A great deal", "A red flag", "Normal"], answer: 1 } },
  { id: "volatility", world: 3, title: "Volatility", sentence: "Volatility is how wildly a price swings.", example: "Tesla can move ±5% on a normal day; an MSCI World ETF usually ±1%.", game: "Rollercoaster",
    quiz: { q: "Which usually swings more?", options: ["A single growth stock", "A world ETF", "A savings account"], answer: 0 } },
  { id: "drawdown", world: 3, title: "Drawdown", sentence: "A drawdown is how far your portfolio fell from its highest point.", example: "10,000 € → 7,000 € is a 30% drawdown. To get back you need +43%.", game: "The cliff",
    quiz: { q: "After a 50% drop, how much do you need to get back to start?", options: ["+50%", "+100%", "+25%"], answer: 1 } },
  { id: "diversification", world: 3, title: "Diversification", sentence: "Don't put all your eggs in one basket.", example: "One stock collapses 90%: all-in → −90%. Spread across 10 → about −9%.", game: "Egg drop", minigame: "eggs",
    quiz: { q: "Why diversify?", options: ["To guarantee profit", "So one bad company can't ruin you", "To pay less tax"], answer: 1 } },
  { id: "correlation", world: 3, title: "Correlation", sentence: "Some stocks tend to move together.", example: "A scandal at one carmaker often drags Mercedes, VW and BMW down together.", game: "Dominoes",
    quiz: { q: "You own 5 car makers. Are you well diversified?", options: ["Yes, 5 companies", "Not really — they move together", "Only if they're German"], answer: 1 } },
  { id: "liquidity", world: 3, title: "Liquidity", sentence: "Liquidity is how fast you can sell without losing value.", example: "A big stock sells in seconds. A flat can take months.", game: "Garage sale",
    quiz: { q: "Which is most liquid?", options: ["Apple shares", "A holiday flat", "A rare painting"], answer: 0 } },
  // World 4
  { id: "compound", world: 4, title: "Compound interest", sentence: "Your profit earns its own profit — it snowballs.", example: "50 €/month at 7% for 30 years: you pay in 18,000 €, it grows to about 61,000 €.", game: "Snowball", minigame: "snowball",
    quiz: { q: "What makes compounding strongest?", options: ["Time", "Trading often", "Checking prices daily"], answer: 0 } },
  { id: "inflation", world: 4, title: "Inflation", sentence: "Inflation makes money lose buying power over time.", example: "At 3% inflation, 100 € buys only about 74 € worth of stuff after 10 years.", game: "Shrinking cart",
    quiz: { q: "Cash under the mattress for 10 years with 3% inflation…", options: ["Keeps its value", "Loses buying power", "Grows"], answer: 1 } },
  { id: "savings-plan", world: 4, title: "Savings plan", sentence: "A savings plan invests the same amount every month, automatically.", example: "25 € every month into an ETF — no timing, no stress.", game: "Autopilot",
    quiz: { q: "Main advantage of a savings plan?", options: ["You never have to decide when to buy", "Guaranteed profit", "No fees ever"], answer: 0 } },
  { id: "cost-average", world: 4, title: "Cost-average effect", sentence: "When prices are low, the same monthly amount buys more shares.", example: "Price drops 30% → your 100 € buys about 43% more shares that month.", game: "Sale season",
    quiz: { q: "For a monthly saver, a market dip means…", options: ["Buying more shares cheaply", "Losing the savings plan", "Paying higher fees"], answer: 0 } },
  { id: "rebalancing", world: 4, title: "Rebalancing", sentence: "Rebalancing brings your portfolio back to your planned mix.", example: "Plan 70/30 stocks/bonds; after a rally it's 80/20 → sell some stocks, buy bonds.", game: "Balance the scale",
    quiz: { q: "Stocks rallied and now are 85% instead of 70%. Rebalancing means…", options: ["Buying more stocks", "Selling some stocks", "Doing nothing ever"], answer: 1 } },
  { id: "horizon", world: 4, title: "Investment horizon", sentence: "When you need the money changes how much risk you can take.", example: "Money for a flat in 2 years ≠ money for retirement in 30 years.", game: "Two clocks",
    quiz: { q: "Money needed in 1 year should mostly be…", options: ["In a single stock", "Safe and easy to access", "In crypto"], answer: 1 } },
  // World 5
  { id: "earnings", world: 5, title: "Earnings report", sentence: "Companies report results every quarter — prices react to how they compare with expectations.", example: "Profit +10% sounds great — but if +15% was expected, the stock can fall.", game: "Beat or miss",
    quiz: { q: "Profit up 10%, analysts expected 15%. The stock likely…", options: ["Rises", "Falls", "Doesn't trade"], answer: 1 } },
  { id: "priced-in", world: 5, title: "Priced in", sentence: "The market often moves before the news — when it's announced, it's already in the price.", example: "A dividend hike everyone expected barely moves the price on the day.", game: "Too late",
    quiz: { q: "Expected news is finally announced. The price…", options: ["Usually jumps a lot", "Often barely moves", "Always falls"], answer: 1 } },
  { id: "interest-rates", world: 5, title: "Interest rates", sentence: "When central bank rates change, almost everything moves.", example: "Rates up → bonds more attractive, loans pricier → stocks, especially tech, often fall.", game: "Rate lever",
    quiz: { q: "The central bank raises rates. Growth/tech stocks usually…", options: ["Rise", "Fall", "Aren't affected"], answer: 1 } },
  { id: "rumor", world: 5, title: "Buy the rumor, sell the news", sentence: "Prices rise on hope and often fall on confirmation — or when the rumor turns out false.", example: "'Takeover talks!' → +8%. 'Company denies talks' → −12%.", game: "Hype cycle",
    quiz: { q: "A stock jumps 10% on an unconfirmed rumor. The risk is…", options: ["None", "It falls if the rumor is wrong", "It gets delisted"], answer: 1 } },
  { id: "pe-ratio", world: 5, title: "P/E ratio", sentence: "P/E shows how many years of today's profit the price equals.", example: "Price 100 €, profit 5 € per share → P/E 20.", game: "Expensive or cheap",
    quiz: { q: "Price 60 €, profit 3 € per share. P/E is…", options: ["20", "3", "180"], answer: 0 } },
  { id: "bull-bear", world: 5, title: "Bull & bear market", sentence: "A bull market is a long rise, a bear market a long fall (usually −20% or more).", example: "2020: a sharp bear market in March, then a strong bull market.", game: "Weather forecast",
    quiz: { q: "Markets fell 25% over months. That's a…", options: ["Bull market", "Bear market", "Dividend"], answer: 1 } },
  { id: "taxes", world: 5, title: "Taxes & allowance", sentence: "Investment profits are taxed, but there is a yearly tax-free allowance.", example: "Set a Freistellungsauftrag at your bank so profits up to the allowance stay tax-free.", game: "Tax shield",
    quiz: { q: "Without a Freistellungsauftrag, your bank…", options: ["Withholds tax right away", "Never taxes you", "Closes your depot"], answer: 0 } },
];

export const conceptById = (id: string) => CONCEPTS.find((c) => c.id === id);
