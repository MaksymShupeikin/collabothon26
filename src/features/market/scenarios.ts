import { quotes } from "./history-quotes.ts";
import { COMPANIES, DAX_ETF, ETF_SYM } from "./companies.ts";
import { generateNews, type News, type NewsKind } from "./news.ts";
import { registerUniverse, type Path, type Universe } from "./engine.ts";

/**
 * Every market the player can be in.
 * - main: the player's own sandbox (web cabinet + free play), simulated future, macro/sector news only.
 * - sim-*: short simulated lessons, macro/sector news only, labelled "Simulated".
 * - replay-*: historical replays. Real companies, real events retold as our own short factual headlines,
 *   mock prices shaped like the real curve. Figures are approximate; see docs/replay-sources.md.
 */

const STOCKS = COMPANIES.filter((c) => c.type === "Aktie").map((c) => c.sym);
const ALL = COMPANIES.map((c) => c.sym);

let nid = 0;
type H = { day: number; time?: string; kind: NewsKind; headline: string; body?: string; major?: boolean; sym?: string; effects?: News["effects"]; explain: string; concept: string; source?: string };
const news = (list: H[], source = "Newswire"): News[] =>
  list.map((h) => ({ source, major: true, effects: [], time: "09:00:00", ...h, id: `s${++nid}` })).sort((a, b) => a.day - b.day);

export const MAIN_DAYS = 2900; // > 10 years of trading days, so World 4 can fast-forward
export const MAIN: Universe = {
  id: "main", seed: 2026, syms: ALL, days: MAIN_DAYS, history: 1300,
  news: generateNews(MAIN_DAYS, 2026, -40), etf: { sym: ETF_SYM, of: STOCKS }, startDate: "2026-11-24",
};

// ── Simulated lessons (World 2) ───────────────────────────────────────────

const SIM_PRICED: Universe = {
  id: "sim-priced", seed: 11, syms: ALL, days: 10, history: 260, etf: { sym: ETF_SYM, of: STOCKS }, startDate: "2026-11-24",
  news: news([
    { day: 1, kind: "noise", major: false, headline: "Survey: economists expect the ECB to keep rates unchanged on Thursday", explain: "An expectation everyone can read. Prices adjust to it right away.", concept: "priced-in" },
    { day: 4, kind: "priced_in", headline: "ECB keeps key rate unchanged, as widely expected", effects: [{ target: "*", from: 4, days: 1, total: 0.002 }], explain: "Everyone expected it, so it was already in the price. Nothing new, no move.", concept: "priced-in" },
    { day: 7, kind: "macro", headline: "Inflation falls more than expected", effects: [{ target: "*", from: 7, days: 2, total: 0.025 }], explain: "This was a surprise: new information, so prices moved.", concept: "priced-in" },
  ], "Simulated newswire"),
};

const SIM_RUMOR: Universe = {
  id: "sim-rumor", seed: 12, syms: ALL, days: 12, history: 260, etf: { sym: ETF_SYM, of: STOCKS }, startDate: "2026-11-24",
  news: news([
    { day: 2, kind: "rumor", headline: "Report: government considers new purchase bonus for electric cars, sources say", body: "No official confirmation. A ministry spokesperson declined to comment.", effects: [{ target: "sector:Auto", from: 2, days: 2, total: 0.07 }], explain: "An unconfirmed rumor. Car stocks rose on hope alone.", concept: "rumor" },
    { day: 7, kind: "signal", headline: "Government: no new purchase bonus for electric cars planned", effects: [{ target: "sector:Auto", from: 7, days: 2, total: -0.09 }], explain: "The rumor was wrong. Whoever bought the hype lost money.", concept: "rumor" },
  ], "Simulated newswire"),
};

/** World 2 mission: three headlines in one simulated week. */
const W2_MISSION: Universe = {
  id: "w2-mission", seed: 13, syms: ALL, days: 6, history: 260, etf: { sym: ETF_SYM, of: STOCKS }, startDate: "2026-11-30",
  news: news([
    { day: 1, kind: "noise", headline: 'Star investor on TV: "The market could double this year"', explain: "An opinion, not information. Nothing about any company changed.", concept: "signal-noise" },
    { day: 3, kind: "priced_in", headline: "ECB keeps key rate unchanged, as widely expected", effects: [{ target: "*", from: 3, days: 1, total: 0.002 }], explain: "Everyone expected it. It was already in the price.", concept: "priced-in" },
    { day: 5, kind: "sector", headline: "New chip export limits announced, effective immediately", effects: [{ target: "sector:Tech", from: 5, days: 2, total: -0.07 }], explain: "Real new information that hits a whole sector. Worth checking how much tech you own.", concept: "signal-noise" },
  ], "Simulated newswire"),
};

// ── World 4: ten years with a savings plan ────────────────────────────────

const W4_PLAN: Universe = {
  id: "w4-plan", seed: 14, syms: [ETF_SYM], days: 2530, history: 260, startDate: "2027-01-04",
  // ~7 % a year on average with a bad year 3 (−22 %), so cost averaging shows.
  paths: { [ETF_SYM]: [[0, 100], [252, 108], [504, 117], [640, 91], [756, 99], [1008, 118], [1260, 129], [1512, 141], [1764, 150], [2016, 166], [2268, 181], [2530, 197]] },
  news: news([
    { day: 560, kind: "macro", headline: "Recession fears: stock markets fall for the third month in a row", effects: [], explain: "A bad year. Your savings plan bought more shares while prices were low.", concept: "savings-plan" },
  ], "Simulated newswire"),
};

// ── Historical replays ────────────────────────────────────────────────────

export type BotId = "max" | "paula" | "alex" | "sam";
export type BotMove = { day: number; bot: BotId; side: "buy" | "sell"; buys?: [string, number][]; sells?: string[]; say: string; spot?: { options: string[]; answer: number; why: string } };
export type Replay = {
  id: string;
  universe: Universe;
  hero: string; // the real company the replay is about
  cover: string; // what the player sees instead of the name until the reveal
  coverWkn: string;
  reveal: string; // "This was Wirecard, June 2020."
  after: string; // what happened next
  concept: string;
  boss?: BotId;
  bots: BotId[];
  moves: BotMove[];
  win: string; // the boss rule in one sentence
  avoid: (s: { weights: Record<string, number>[]; trades: { day: number; sym: string; side: string }[] }) => boolean; // did the player avoid the boss mistake?
  budget: number;
};

const day = (d: number, p: number): [number, number] => [d, p];

function historicalNews(list: (Omit<H, "day"> & { session: string })[]): News[] {
  return news(list.map((item) => ({ ...item, day: 0 })));
}

const WIRECARD: Universe = {
  id: "replay-wirecard", seed: 21, syms: ["WDI", DAX_ETF, "SAP", "ALV", "DTE", "SIE"], days: 14, history: 260, startDate: "2020-06-09", hideDate: true,
  historical: {},
  paths: {
    WDI: [day(0, 95.4), day(2, 99.1), day(4, 103.2), day(6, 104.5), day(7, 39.9), day(8, 25.5), day(9, 14.4), day(10, 13.0), day(11, 12.8), day(12, 3.2), day(13, 1.9), day(14, 1.3)] as Path,
  },
  news: historicalNews([
    { session: "2020-06-10", kind: "noise", headline: "Payment stocks in demand: online shopping keeps growing", explain: "A general trend everyone already knew. Nothing new about this company.", concept: "signal-noise" },
    { session: "2020-06-12", kind: "noise", major: false, headline: "Analyst keeps 'buy' rating on DAX payments company", explain: "An opinion, not new information.", concept: "signal-noise" },
    { session: "2020-06-16", kind: "signal", major: false, headline: "Payments company confirms: annual results will be published on Thursday", explain: "A date, not a result.", concept: "signal-noise" },
    { session: "2020-06-18", time: "10:42:13", kind: "signal", sym: "WDI", headline: "Auditor refuses to sign off the annual accounts: 1,9 bn € of cash cannot be confirmed", body: "The company says it does not know whether the money exists. The share loses more than half of its value within hours.", explain: "Real, very bad new information about this one company.", concept: "diversification" },
    { session: "2020-06-19", time: "08:31:02", kind: "signal", sym: "WDI", headline: "The CEO of the payments company resigns", explain: "The crisis is getting deeper.", concept: "diversification" },
    { session: "2020-06-22", time: "07:55:40", kind: "signal", sym: "WDI", headline: "Company: the missing 1,9 bn € most likely do not exist", explain: "A quarter of the balance sheet was not real.", concept: "diversification" },
    { session: "2020-06-25", time: "11:05:00", kind: "signal", sym: "WDI", headline: "Payments company files for insolvency", body: "It is the first DAX member ever to go insolvent.", explain: "The share is almost worthless.", concept: "diversification" },
  ]),
};

const GAMESTOP: Universe = {
  id: "replay-gamestop", seed: 22, syms: ["GME", ETF_SYM, "AAPL", "MSFT", "SAP"], days: 20, history: 260, startDate: "2021-01-12", hideDate: true,
  historical: {},
  etf: { sym: ETF_SYM, of: ["AAPL", "MSFT", "SAP"] },
  // USD closes converted at ~0,82 €/$
  paths: { GME: [day(0, 16.4), day(1, 25.8), day(2, 32.7), day(5, 32.3), day(7, 35.3), day(8, 53.3), day(9, 63.1), day(10, 121.3), day(11, 285.0), day(12, 158.8), day(13, 266.5), day(14, 184.5), day(15, 73.8), day(16, 75.4), day(17, 43.9), day(18, 52.3), day(19, 49.2), day(20, 41.0)] as Path },
  news: historicalNews([
    { session: "2021-01-13", kind: "signal", sym: "GME", headline: "US video-game retailer: shares jump 57 % after a well-known investor joins the board", explain: "Real news, but the jump was far bigger than the news itself.", concept: "rumor" },
    { session: "2021-01-22", kind: "rumor", sym: "GME", headline: "Online forum users pile into the heavily shorted video-game retailer", explain: "Hype, not information about the business.", concept: "rumor" },
    { session: "2021-01-27", kind: "noise", sym: "GME", headline: "Celebrity tech CEO posts about the stock; it doubles in one day", explain: "A post is not a business result.", concept: "rumor" },
    { session: "2021-01-27", kind: "rumor", sym: "GME", headline: "Short sellers report heavy losses; share up more than 130 % in one day", explain: "The price is driven by a squeeze and hype, not by the company.", concept: "rumor" },
    { session: "2021-01-28", kind: "signal", sym: "GME", headline: "Several trading apps restrict buying of the share", explain: "Without new buyers, the hype loses fuel.", concept: "rumor" },
    { session: "2021-02-02", kind: "signal", sym: "GME", headline: "Share falls 60 % in one day as the hype fades", explain: "Buy the rumor, sell the news: the latecomers paid the bill.", concept: "rumor" },
  ]),
};

const VW: Universe = {
  id: "replay-vw", seed: 23, syms: ["VOW3", DAX_ETF, "MBG", "SAP", "ALV"], days: 10, history: 260, startDate: "2015-09-15", hideDate: true,
  historical: {},
  paths: { VOW3: [day(0, 165.1), day(1, 163.0), day(3, 162.2), day(4, 132.0), day(5, 106.0), day(6, 111.5), day(7, 107.3), day(8, 104.9), day(9, 101.0), day(10, 97.6)] as Path },
  news: historicalNews([
    { session: "2015-09-17", kind: "noise", headline: "Motor show in Frankfurt opens with record crowds", explain: "Nice for the city, nothing new about any carmaker's business.", concept: "signal-noise" },
    { session: "2015-09-21", time: "08:00:00", kind: "signal", sym: "VOW3", headline: "US environmental agency: German carmaker used software to cheat on diesel emission tests", explain: "Real, new and serious: fines, recalls and lost trust. The share fell about 19 % in one day.", concept: "signal-noise" },
    { session: "2015-09-22", time: "12:10:44", kind: "signal", sym: "VOW3", headline: "Carmaker admits 11 million vehicles worldwide are affected and sets aside 6,5 bn €", explain: "The problem is much bigger than first thought. Another day of about −20 %.", concept: "signal-noise" },
    { session: "2015-09-23", time: "09:30:00", kind: "noise", headline: 'Analyst on TV: "The whole auto sector is finished"', explain: "A dramatic opinion. Other carmakers' businesses had not changed.", concept: "signal-noise" },
    { session: "2015-09-23", time: "17:05:00", kind: "signal", sym: "VOW3", headline: "The carmaker's CEO resigns", explain: "Expected after two days of crisis; the share even rose a little.", concept: "priced-in" },
  ]),
};

const NVIDIA: Universe = {
  id: "replay-nvidia", seed: 24, syms: ["NVDA", ETF_SYM, "SAP", "ALV", "DTE"], days: 250, history: 260, startDate: "2023-01-03", hideDate: true,
  historical: {},
  paths: { [ETF_SYM]: [day(0, 66.5), day(60, 70.1), day(120, 73.8), day(205, 70.2), day(250, 79.6)], NVDA: [day(0, 133), day(21, 190), day(40, 215), day(62, 255), day(98, 283), day(99, 352), day(124, 385), day(167, 452), day(205, 372), day(230, 430), day(250, 448)] as Path },
  news: historicalNews([
    { session: "2023-01-03", kind: "noise", headline: "US chipmaker's share lost about half of its value last year", explain: "Old news: already in the price.", concept: "volatility" },
    { session: "2023-02-08", kind: "sector", headline: "AI chatbot hype lifts chip stocks", explain: "A theme everyone talks about. Prices can run far ahead of profits.", concept: "volatility" },
    { session: "2023-05-25", kind: "signal", sym: "NVDA", headline: "Chipmaker expects about 11 bn $ revenue next quarter; analysts had expected about 7 bn $", explain: "A huge surprise versus expectations: the share jumped about 24 % in one day.", concept: "volatility" },
    { session: "2023-10-17", kind: "sector", headline: "US tightens export rules for AI chips to China", explain: "Sector risk: one rule hits all chip companies at once.", concept: "volatility" },
  ]),
};

const COVID: Universe = {
  id: "replay-covid", seed: 25, syms: [DAX_ETF, ETF_SYM, "LHA", "ALV", "DTE"], days: 229, history: 260, startDate: "2020-02-03", hideDate: true,
  historical: { volatility: [{ from: 16, through: 42, multiplier: 2.4 }, { from: 43, through: 65, multiplier: 1.5 }] },
  paths: {
    // DAX points / 110 ≈ price of a DAX ETF share
    [DAX_ETF]: [
      day(0, 118.6), day(12, 125.4), day(16, 116.3), day(19, 108.1),
      // Session closes around the March 9 oil shock and March 12 travel ban.
      day(24, 104.93), day(25, 96.59), day(26, 95.23), day(27, 94.90), day(28, 83.28),
      day(29, 83.93), day(31, 79.47), day(32, 81.26), day(33, 76.74), day(34, 78.28),
      day(35, 81.17), day(38, 89.77), day(48, 96.0), day(66, 96.4), day(87, 116.5),
      day(124, 111.9), day(146, 118.7), day(190, 105.1), day(195, 112.04),
      // Nov 6 close and Nov 9 close: keep the vaccine jump on the news session.
      day(197, 113.45), day(198, 119.05), day(226, 125.4), day(229, 124.7),
    ],
    [ETF_SYM]: [day(0, 58.9), day(12, 61.6), day(19, 54.0), day(33, 44.3), day(36, 43.1), day(48, 49.0), day(87, 54.5), day(146, 57.8), day(190, 55.0), day(198, 59.6), day(229, 63.0)],
    LHA: [day(0, 14.6), day(12, 13.9), day(19, 11.9), day(33, 7.9), day(38, 9.4), day(66, 7.8), day(87, 10.1), day(146, 8.2), day(190, 6.9), day(198, 8.6), day(229, 10.6)],
    ALV: [day(0, 214), day(12, 228), day(19, 196), day(33, 136), day(38, 155), day(87, 188), day(146, 186), day(190, 150), day(198, 172), day(229, 199)],
    DTE: [day(0, 15.1), day(12, 16.4), day(19, 14.3), day(33, 11.3), day(48, 13.5), day(87, 14.9), day(146, 14.6), day(190, 13.3), day(229, 14.9)],
  },
  news: historicalNews([
    { session: "2020-02-19", kind: "noise", headline: "DAX closes at a record high", explain: "Looking back, the top. Nobody can see that in the moment.", concept: "volatility" },
    { session: "2020-02-24", kind: "signal", headline: "Northern Italy closes towns as virus cases rise sharply", explain: "The first sign the virus reaches Europe's economy.", concept: "volatility" },
    { session: "2020-03-09", kind: "macro", headline: "Oil price collapses by about a quarter after producers fail to agree", explain: "A second shock on top of the first.", concept: "volatility" },
    { session: "2020-03-12", kind: "macro", headline: "US suspends most travel from Europe; worst day for stocks in decades", explain: "Panic. The drawdown is now about 35 %.", concept: "volatility" },
    { session: "2020-03-16", kind: "macro", headline: "Germany closes borders to several neighbours; most shops must close", explain: "Close to the bottom, but nobody knows that yet.", concept: "volatility" },
    { session: "2020-03-19", kind: "macro", headline: "ECB announces 750 bn € emergency bond-buying programme", explain: "Central banks step in. The low is reached around now.", concept: "volatility" },
    { session: "2020-03-23", kind: "macro", headline: "Germany agrees a huge rescue package for companies and workers", explain: "Help arrives. Markets start to recover long before the virus is gone.", concept: "volatility" },
    { session: "2020-05-04", kind: "macro", headline: "Lockdowns ease across Europe", explain: "Prices had already risen a lot: the recovery was priced in early.", concept: "priced-in" },
    { session: "2020-07-21", kind: "macro", headline: "EU leaders agree on a 750 bn € recovery fund", explain: "More support for the economy.", concept: "volatility" },
    { session: "2020-11-09", kind: "macro", headline: "Vaccine more than 90 % effective in trial, first results show", explain: "Real, surprising news: markets jumped the same day.", concept: "volatility" },
    { session: "2020-12-28", kind: "macro", headline: "First vaccinations start in the EU", explain: "By now, the DAX is back at its old high.", concept: "volatility" },
  ]),
};

const HOLDS = (sym: string, max: number) => (s: { weights: Record<string, number>[] }) => s.weights.every((w) => (w[sym] ?? 0) <= max);

export const REPLAYS: Record<string, Replay> = {
  wirecard: {
    id: "wirecard", universe: WIRECARD, hero: "WDI", cover: "DAX payments company", coverWkn: "●●●●●●",
    reveal: "This was Wirecard, June 2020.",
    after: "Wirecard was the first DAX member ever to go insolvent. The share went from about 104 € to around 1 € in one week. People who had everything in it lost almost everything.",
    concept: "diversification", boss: "alex", bots: ["alex", "max", "paula", "sam"], budget: 1000,
    win: "Never have more than 30 % of your depot in one stock, and beat Alex's risk-adjusted score.",
    avoid: HOLDS("WDI", 0.3),
    moves: [
      { day: 0, bot: "alex", side: "buy", buys: [["WDI", 1]], say: "They're a DAX star, what could go wrong? Everything in!",
        spot: { options: ["Everything in one stock", "The fees are too high", "Nothing, it's a DAX company"], answer: 0, why: "Being in the DAX doesn't protect a company. One stock can always fail." } },
      { day: 0, bot: "sam", side: "buy", buys: [[DAX_ETF, 1]], say: "Same as every month: the whole index." },
      { day: 0, bot: "paula", side: "buy", buys: [["SAP", 0.25], ["ALV", 0.25], ["DTE", 0.25], [DAX_ETF, 0.25]], say: "A bit of everything. I feel safe." },
      { day: 7, bot: "paula", side: "sell", sells: ["SAP", "ALV", "DTE", DAX_ETF], say: "A DAX company crashed! Sell everything, now!",
        spot: { options: ["Selling everything because of one company's news", "Not selling fast enough", "Nothing, selling is always safe"], answer: 0, why: "Paula doesn't even own that company. Her stocks barely moved." } },
      { day: 10, bot: "max", side: "buy", buys: [["WDI", 1]], say: "Everyone online says it'll bounce back to 100! All in!",
        spot: { options: ["Buying on hype, not on facts", "Buying too little", "Nothing, it's cheap now"], answer: 0, why: "\"Cheap\" isn't \"safe\". The facts said the money was gone." } },
    ],
  },
  gamestop: {
    id: "gamestop", universe: GAMESTOP, hero: "GME", cover: "US video-game retailer", coverWkn: "●●●●●●",
    reveal: "This was GameStop, January 2021.",
    after: "Within two weeks the share went from about 20 $ to almost 350 $ and back below 50 $. Most people who bought during the hype lost money.",
    concept: "rumor", boss: "max", bots: ["max", "alex", "paula", "sam"], budget: 1000,
    win: "Don't buy the stock after it has already doubled, and beat Max's risk-adjusted score.",
    avoid: (s) => !s.trades.some((t) => t.sym === "GME" && t.side === "buy" && t.day >= 8),
    moves: [
      { day: 0, bot: "sam", side: "buy", buys: [[ETF_SYM, 1]], say: "World ETF, like every month." },
      { day: 0, bot: "paula", side: "buy", buys: [["AAPL", 0.3], ["MSFT", 0.3], [ETF_SYM, 0.4]], say: "Big names, nice and calm." },
      { day: 2, bot: "alex", side: "buy", buys: [["MSFT", 1]], say: "I only trust one company. All in Microsoft." },
      { day: 10, bot: "max", side: "buy", buys: [["GME", 1]], say: "Everyone on Reddit is buying! All in!",
        spot: { options: ["Buying on hype, not on facts", "The fees are too high", "Nothing, it's a popular stock"], answer: 0, why: "The price had already tripled on posts and forum hype. Nothing about the business had changed." } },
      { day: 17, bot: "max", side: "sell", sells: ["GME"], say: "It's crashing! Get me out!",
        spot: { options: ["Selling in panic after buying the hype", "Selling too late is impossible", "Nothing, he took profit"], answer: 0, why: "Bought high on hype, sold low in panic: the classic FOMO round trip." } },
    ],
  },
  vw: {
    id: "vw", universe: VW, hero: "VOW3", cover: "German carmaker (preference shares)", coverWkn: "●●●●●●",
    reveal: "This was Volkswagen, September 2015 (\"Dieselgate\").",
    after: "The share lost about a third in a few days. Other carmakers fell less: the problem was at one company, not in the whole sector.",
    concept: "signal-noise", bots: ["paula", "sam"], budget: 1000, win: "", avoid: () => true,
    moves: [
      { day: 0, bot: "sam", side: "buy", buys: [[DAX_ETF, 1]], say: "The index, as always." },
      { day: 0, bot: "paula", side: "buy", buys: [["VOW3", 0.3], ["MBG", 0.3], ["SAP", 0.4]], say: "Two carmakers and SAP." },
      { day: 6, bot: "paula", side: "sell", sells: ["MBG"], say: "TV says the whole auto sector is finished! Sell Mercedes too!",
        spot: { options: ["Reacting to an opinion, not to facts", "Selling too slowly", "Nothing, the analyst knows best"], answer: 0, why: "The news was about one carmaker. The TV quote was opinion: noise." } },
    ],
  },
  nvidia: {
    id: "nvidia", universe: NVIDIA, hero: "NVDA", cover: "US chipmaker", coverWkn: "●●●●●●",
    reveal: "This was NVIDIA, 2023.",
    after: "The share more than tripled in 2023, with drops of 15–20 % along the way. Alex won this round, but with the same habit he lost everything on Wirecard.",
    concept: "volatility", bots: ["alex", "sam"], budget: 1000, win: "", avoid: () => true,
    moves: [
      { day: 0, bot: "alex", side: "buy", buys: [["NVDA", 1]], say: "AI is the future. Everything in!",
        spot: { options: ["Everything in one stock", "Buying a tech company", "Nothing, AI will win"], answer: 0, why: "It may work, but the risk is the same as with any single stock. Judge the decision, not the outcome." } },
      { day: 0, bot: "sam", side: "buy", buys: [[ETF_SYM, 1]], say: "World ETF. Boring is fine." },
    ],
  },
  covid: {
    id: "covid", universe: COVID, hero: DAX_ETF, cover: "DAX index (ETF)", coverWkn: "●●●●●●",
    reveal: "This was the COVID crash, February to December 2020.",
    after: "The DAX fell by almost 40 % in four weeks, then was back at its record high by the end of the year. Selling at the bottom turned a temporary loss into a real one.",
    concept: "volatility", boss: "paula", bots: ["paula", "max", "alex", "sam"], budget: 1000,
    win: "Don't sell your depot during the crash (days 25–40), and beat Paula's risk-adjusted score.",
    avoid: (s) => !s.trades.some((t) => t.side === "sell" && t.day >= 25 && t.day <= 40),
    moves: [
      { day: 0, bot: "paula", side: "buy", buys: [[DAX_ETF, 0.6], ["ALV", 0.2], ["DTE", 0.2]], say: "A nice diversified start." },
      { day: 0, bot: "sam", side: "buy", buys: [[ETF_SYM, 1]], say: "World ETF. And then: nothing." },
      { day: 0, bot: "alex", side: "buy", buys: [["LHA", 1]], say: "Everyone flies. Lufthansa, all in!" },
      { day: 31, bot: "paula", side: "sell", sells: [DAX_ETF, "ALV", "DTE"], say: "Down 35 %?! Get me out before it goes to zero!",
        spot: { options: ["Selling after a big drop, near the bottom", "Not having a savings plan", "Nothing, cash is safe"], answer: 0, why: "Selling locks in the loss. Her horizon is years, not weeks." } },
      { day: 146, bot: "paula", side: "buy", buys: [[DAX_ETF, 1]], say: "OK, it's been rising for months. Safe to get back in now!",
        spot: { options: ["Buying back higher than she sold", "Buying an ETF", "Nothing, she's careful"], answer: 0, why: "She sold low and bought high: the cost of panic." } },
      { day: 12, bot: "max", side: "buy", buys: [["LHA", 1]], say: "DAX at a record high! Everyone's getting rich. All in!",
        spot: { options: ["Buying on euphoria, not on facts", "Buying an airline", "Nothing, records mean it keeps going"], answer: 0, why: "A record high says nothing about tomorrow. He bought on a feeling, all in one stock." } },
    ],
  },
};

export const SIM_LESSONS = { priced: SIM_PRICED, rumor: SIM_RUMOR, w2: W2_MISSION, plan: W4_PLAN };

const replayEnd: Record<string, string> = {
  wirecard: "2020-06-29", gamestop: "2021-02-09", vw: "2015-09-29", nvidia: "2023-12-29", covid: "2020-12-30",
};
for (const replay of Object.values(REPLAYS)) {
  const u = replay.universe;
  // Wirecard traded on Xetra. Use the DAX calendar even when its own quotes are missing.
  const calendar = quotes[replay.hero === "WDI" ? DAX_ETF : replay.hero].map(([date]) => date);
  const before = calendar.filter((date) => date < u.startDate).slice(-40);
  const playable = calendar.filter((date) => date >= u.startDate && date <= replayEnd[replay.id]);
  u.historical!.sessions = [...before, ...playable];
  u.history = before.length;
  u.days = playable.length - 1;
  for (const [sym, path] of Object.entries(u.paths ?? {})) {
    path[path.length - 1][0] = u.days;
    const data = new Map(quotes[sym]?.map(([date, , , , close]) => [date, close]));
    for (const anchor of path) anchor[1] = data.get(playable[anchor[0]]) ?? anchor[1];
  }
  for (const item of u.news) {
    item.day = playable.indexOf(item.session!);
    if (item.day < 0) throw new Error(`Missing trading session ${item.session} for ${u.id}`);
  }
  // The original GME script counted the US holiday on January 18 as a session.
  if (replay.id === "gamestop") for (const move of replay.moves) if (move.day >= 4) move.day--;
}
for (const r of Object.values(REPLAYS)) r.moves.sort((a, b) => a.day - b.day);
for (const u of [MAIN, SIM_PRICED, SIM_RUMOR, W2_MISSION, W4_PLAN, ...Object.values(REPLAYS).map((r) => r.universe)]) registerUniverse(u);
