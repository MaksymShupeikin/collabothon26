// The 12 concept cards of the MVP (idea.md §12). Front: one sentence. Back: example + one quiz question.
// The longer roadmap list lives in concepts.ts.
export type Card = {
  id: string;
  world: number;
  title: string;
  front: string;
  example: string;
  quiz: { q: string; options: string[]; answer: number };
};

export const CARDS: Card[] = [
  { id: "stock", world: 1, title: "Stock", front: "A stock is a small piece of a company.",
    example: "Buy one share of Deutsche Telekom and you own a tiny slice of Deutsche Telekom.",
    quiz: { q: "You buy 1 share of Siemens. What do you own?", options: ["A loan to Siemens", "A tiny piece of Siemens", "A Siemens voucher"], answer: 1 } },
  { id: "order-types", world: 1, title: "Market vs. limit order", front: "A market order buys now at any price. A limit order buys only at your price or better.",
    example: "Limit 30,00 € on a share at 30,20 € → your order waits until the price is 30,00 € or lower.",
    quiz: { q: "What does a limit order protect you from?", options: ["Paying more than you planned", "Any loss", "Order fees"], answer: 0 } },
  { id: "fees", world: 1, title: "Fees & spread", front: "Every order costs a fee, and you buy a little above and sell a little below the mid price.",
    example: "A 4,90 € fee is almost 5 % of a 100 € order, but only 0,5 % of a 1.000 € order.",
    quiz: { q: "Why do small single orders hurt more?", options: ["The fixed fee is a bigger share of the amount", "Small orders are taxed more", "They don't"], answer: 0 } },
  { id: "pnl", world: 1, title: "Profit & loss", front: "Profit or loss is today's value minus what you paid, costs included.",
    example: "Bought for 65,05 € incl. costs, worth 66,10 € now → +1,05 € (+1,6 %), on paper until you sell.",
    quiz: { q: "Your position shows −3 %. Have you lost money?", options: ["Only on paper, until you sell", "Yes, it's gone", "No, losses don't count"], answer: 0 } },
  { id: "signal-noise", world: 2, title: "Signal vs. noise", front: "Most headlines are noise. A signal is new information that changes a company's future.",
    example: "\"Auditor can't confirm 1,9 bn €\" is a signal. \"Analyst on TV is excited\" is noise.",
    quiz: { q: "Which one is a signal?", options: ["A blogger says the chart looks weak", "A company cuts its profit forecast", "Rainy weekend in Frankfurt"], answer: 1 } },
  { id: "priced-in", world: 2, title: "Priced in", front: "When everyone expects a piece of news, it's already in the price before it's announced.",
    example: "The ECB keeps rates unchanged, as expected: the market barely moves.",
    quiz: { q: "Expected news is finally announced. The price usually…", options: ["Jumps", "Barely moves", "Always falls"], answer: 1 } },
  { id: "rumor", world: 2, title: "Buy the rumor, sell the news", front: "Prices rise on hope and often fall when the rumor is confirmed or denied.",
    example: "\"Purchase bonus for e-cars, sources say\" → car stocks +6 %. \"No bonus planned\" → −8 %.",
    quiz: { q: "A stock jumps on an unconfirmed rumor. The risk is…", options: ["None", "It falls if the rumor is wrong", "It gets delisted"], answer: 1 } },
  { id: "volatility", world: 3, title: "Volatility & drawdown", front: "Volatility is how wildly a price swings. Drawdown is how far it fell from its peak.",
    example: "From 1.000 € to 700 € is a 30 % drawdown. To get back, you need +43 %.",
    quiz: { q: "After a 50 % drop, how much do you need to get back?", options: ["+50 %", "+100 %", "+25 %"], answer: 1 } },
  { id: "diversification", world: 3, title: "Diversification", front: "Don't put all your eggs in one basket.",
    example: "One stock collapses by 90 %: all-in → −90 %. Spread over 10 → about −9 %.",
    quiz: { q: "Why diversify?", options: ["To guarantee profit", "So one bad company can't ruin you", "To pay less tax"], answer: 1 } },
  { id: "etf", world: 3, title: "ETF", front: "An ETF is a basket of hundreds of companies you buy in one order.",
    example: "100 € in an MSCI World ETF spreads across about 1.400 companies, for one order fee.",
    quiz: { q: "One company in your world ETF crashes 50 %. Your ETF…", options: ["Falls about 50 %", "Barely moves", "Is closed"], answer: 1 } },
  { id: "compound", world: 4, title: "Compound interest", front: "Your gains earn their own gains. Over time, it snowballs.",
    example: "25 €/month at 7 % for 30 years: you pay in 9.000 €, it grows to about 30.000 €.",
    quiz: { q: "What makes compounding strongest?", options: ["Time", "Trading often", "Checking prices daily"], answer: 0 } },
  { id: "savings-plan", world: 4, title: "Savings plan & cost averaging", front: "A savings plan invests the same amount every month. When prices are low, it buys more shares.",
    example: "Price drops 30 % → your 25 € buy about 43 % more shares that month.",
    quiz: { q: "For a monthly saver, a market dip means…", options: ["Buying more shares cheaply", "The plan stops", "Higher fees"], answer: 0 } },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id);
