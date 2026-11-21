import { companyOf, DAX_ETF, ETF_SYM } from "../market/companies.ts";
import { costBasis, depotValue, priceNow, totalValue } from "../market/engine.ts";
import { PERSONAS } from "../game/personas.ts";
import type { Save } from "../game/store.ts";
import type { Ui } from "../game/ui.ts";

export type Ctx = { save: Save; ui: Ui };
export type Step = {
  target?: string;
  title: string;
  text: string | ((c: Ctx) => string);
  task?: string | ((c: Ctx) => string); // the player does it; no Next button
  done?: (c: Ctx) => boolean;
  quiz?: { q: string; options: string[]; answer: number; why: string };
  game?: "basket" | "eggs" | "snowball";
  place?: "corner"; // keep the bubble out of the way (e.g. of a dropdown)
};
export type Mission = {
  goal: (c: Ctx) => string;
  hint: (c: Ctx) => string;
  check: (c: Ctx) => boolean;
  smart: (c: Ctx) => boolean;
  smartLabel: string;
  after?: "week"; // World 1: ⏩ 1 week later, then find the P/L
};
export type Chapter = {
  id: string;
  world: number;
  n: string; // "1.3", "★", "👾"
  kind: "chapter" | "mission" | "boss";
  title: string;
  blurb: string;
  surface: "cabinet" | "pro";
  card?: string[];
  steps?: Step[];
  mission?: Mission;
  start?: { view: string; sym?: string }; // web cabinet screen the chapter starts on
  replay?: string; // historical replay id
  lesson?: string; // simulated lesson universe
};
export type World = { n: number; title: string; surface: string; blurb: string };

export const WORLDS: World[] = [
  { n: 1, title: "First steps", surface: "Web cabinet", blurb: "Top up, find a stock, place your first order." },
  { n: 2, title: "Reading the news", surface: "Trading area", blurb: "Signal or noise? Learn what really moves prices." },
  { n: 3, title: "Risk", surface: "ProTrader", blurb: "Ups and downs, and why one basket is a bad idea." },
  { n: 4, title: "Time", surface: "ProTrader + years", blurb: "Let time and a savings plan do the work." },
];

const hasPos = (c: Ctx, sym: string, qty = 1) => (c.save.sim.acct.holdings[sym]?.qty ?? 0) >= qty;
const persona = (c: Ctx) => PERSONAS[c.save.persona ?? "starter"];

// ── World 1 · web cabinet ─────────────────────────────────────────────────

const W1: Chapter[] = [
  {
    id: "1.1", world: 1, n: "1.1", kind: "chapter", title: "Your cabinet", surface: "cabinet",
    blurb: "Girokonto, trading account and depot: what each one is for.",
    steps: [
      { title: "Welcome to your sandbox", text: "This is the comdirect overview, copied 1:1. Everything here runs on play money." },
      { target: "acc-giro", title: "Girokonto", text: (c) => `Your current account. Your ${PERSONAS[c.save.persona ?? "starter"].start} € of play money starts here.` },
      { target: "acc-verrechnung", title: "Trading account", text: "This is your cash for trading. It's separate from your current account, and it's empty for now." },
      { target: "acc-depot", title: "Depot", text: "Your depot holds the stocks and ETFs you own. Nothing yet." },
      { target: "acc-total", title: "Total", text: "Gesamt adds it all up: the money and everything in your depot." },
      { target: "nav-depot", title: "Look inside", text: "Every account has its own page.", task: "Open your depot.", done: (c) => c.ui.view === "depot" },
      { target: "depot-empty", title: "Empty depot", text: "This is where your first stock will show up, with its profit or loss." },
      { target: "nav-home", title: "Back to the overview", text: "The overview is always one click away.", task: "Go back to the overview.", done: (c) => c.ui.view === "home" },
      { target: "add-play-money", title: "Sandbox button", text: "Need more play money later? This adds some. It's a sandbox control, not a real comdirect function." },
    ],
  },
  {
    id: "1.2", world: 1, n: "1.2", kind: "chapter", title: "Top up", surface: "cabinet",
    blurb: "Move money to your trading account and confirm with photoTAN.",
    steps: [
      { target: "btn-transfer", title: "Money first", text: "To buy a stock, your money has to be on the trading account.", task: "Click \"Transfer\" next to the Girokonto.", done: (c) => c.ui.view === "transfer" },
      { target: "tr-to", title: "From and to", text: "From your Girokonto to your trading account (Verrechnungskonto). Both are already filled in." },
      { target: "tr-amount", title: "Amount", text: "Let's try a small amount first.", task: "Enter 20 €.", done: (c) => c.ui.trAmount === 20 },
      { target: "tr-submit", title: "Check and send", text: "Every transfer is confirmed with a TAN, a one-time code.", task: "Click \"Next\".", done: (c) => !!c.ui.tanOpen || (c.ui.transferDone ?? 0) > 0 },
      { target: "tan-box", title: "photoTAN", text: "In real life you scan this mosaic with the photoTAN app. Here, the phone next to it is simulated.", task: "Type the TAN shown on the phone and confirm.", done: (c) => (c.ui.transferDone ?? 0) > 0 },
      { target: "nav-umsaetze", title: "Did it work?", text: "Every movement of money is listed in your transactions.", task: "Open \"Transactions\".", done: (c) => c.ui.view === "umsaetze" },
      { target: "umsatz-list", title: "Here it is", text: "20 € left the Girokonto and arrived on your trading account." },
    ],
  },
  {
    id: "1.3", world: 1, n: "1.3", kind: "chapter", title: "Find a stock", surface: "cabinet", card: ["stock"],
    blurb: "Search by name, WKN or ISIN, or browse the Aktien-Finder.",
    steps: [
      { target: "header-search", place: "corner", title: "Search", text: "Search by name, WKN or ISIN, exactly like on comdirect.", task: "Search for SAP and open it.", done: (c) => c.ui.view === "stock" && c.ui.sym === "SAP" },
      { target: "stock-ids", title: "WKN and ISIN", text: "Every security has two IDs: the 6-character WKN and the 12-character ISIN. Same company, no mix-ups." },
      { target: "nav-finder", title: "Aktien-Finder", text: "Don't know a name yet? The Aktien-Finder filters by country, index and sector.", task: "Open the Aktien-Finder.", done: (c) => c.ui.view === "finder" },
      { target: "finder-sector", title: "Filter", text: "Narrow it down by sector.", task: "Pick the sector \"Telecom\".", done: (c) => c.ui.finderSector === "Telecom" },
      { target: "finder-results", title: "Results", text: "One hit left.", task: "Open Deutsche Telekom.", done: (c) => c.ui.view === "stock" && c.ui.sym === "DTE" },
    ],
  },
  {
    id: "1.4", world: 1, n: "1.4", kind: "chapter", title: "Read a stock page", surface: "cabinet", start: { view: "stock", sym: "DTE" },
    blurb: "Price, daily change, chart periods, key numbers and news.",
    steps: [
      { title: "A stock page", text: "Let's read the page of Deutsche Telekom, top to bottom." },
      { target: "stock-price", title: "Price", text: "The last price, when it was paid, and on which exchange." },
      { target: "stock-change", title: "Daily change", text: "How much the price moved since yesterday's close. Green up, red down." },
      { target: "stock-chart-tabs", title: "Chart periods", text: "One day says little. Zoom out.", task: "Switch the chart to 1 year (1Y).", done: (c) => c.ui.chartRange === "1Y" },
      { target: "stock-keys", title: "Key numbers", text: "Yesterday's close, today's range and the 52-week range show how much the price usually moves." },
      { target: "stock-news", title: "News", text: "News about the market. In this sandbox it's simulated and only about the economy, never invented company stories." },
    ],
  },
  {
    id: "1.5", world: 1, n: "1.5", kind: "chapter", title: "Place an order", surface: "cabinet", start: { view: "stock", sym: "DTE" }, card: ["order-types", "fees"],
    blurb: "Buy or sell, quantity, exchange, market vs. limit, costs.",
    steps: [
      { target: "stock-buy", title: "Open the order form", text: "From any stock page you can go straight to the order form.", task: (c) => (c.ui.view === "stock" ? "Click \"Buy\"." : "Open the Deutsche Telekom page, then click \"Buy\"."), done: (c) => c.ui.view === "order" },
      { target: "of-side", title: "Buy or sell", text: "You can only sell what you own. We want to buy." },
      { target: "of-qty", title: "Quantity", text: "How many shares. Always whole shares here.", task: "Enter 2.", done: (c) => c.ui.qty === 2 },
      { target: "of-exchange", title: "Exchange", text: "Where the trade happens. Xetra and Tradegate are the big ones, with tight prices." },
      { target: "of-type", title: "Market or limit?", text: "Market buys now at any price. Limit buys only at your price or better.", task: "Choose \"Limit\".", done: (c) => c.ui.orderType === "limit" },
      { target: "of-limit", title: "Your limit", text: "The most you're willing to pay per share.", task: "Enter a limit, for example today's price.", done: (c) => (c.ui.limit ?? 0) > 0 },
      { target: "of-validity", title: "Validity", text: "How long your order waits if the price isn't reached. \"Good for day\" ends at today's close." },
      { target: "of-costs-link", title: "Costs", text: "Every order has a fee, plus a small spread.", task: "Click \"Show order costs\".", done: (c) => !!c.ui.costsOpen },
      { target: "of-costs", title: "Look at the fee", text: (c) => (PERSONAS[c.save.persona ?? "starter"].start <= 100
        ? "A fixed 4,90 € plus 0,25 %. On a 100 € order that's almost 5 %, so fewer, bigger orders are cheaper."
        : "A fixed 4,90 € plus 0,25 %. On 1.000 € that's under 1 %, on 100 € almost 5 %. Fewer, bigger orders are cheaper.") },
      { target: "of-submit", title: "That's the form", text: "You know every field now. In the mission you'll do it for real, on your own." },
    ],
  },
  {
    id: "w1", world: 1, n: "★", kind: "mission", title: "Your first stock", surface: "cabinet", card: ["pnl"],
    blurb: "Top up and buy, on your own. Then ⏩ one week later.",
    mission: {
      goal: (c) => persona(c).w1.text,
      hint: (c) => persona(c).w1.hint + " On the order form choose \"Limit\" and set the limit at or a bit above the current price.",
      check: (c) => hasPos(c, persona(c).w1.sym, persona(c).w1.qty),
      smart: (c) => c.save.sim.acct.trades.some((t) => t.sym === persona(c).w1.sym && t.type === "limit"),
      smartLabel: "Used a limit order",
      after: "week",
    },
  },
];

// ── World 2 · Reading the news ────────────────────────────────────────────

const W2: Chapter[] = [
  {
    id: "2.1", world: 2, n: "2.1", kind: "chapter", title: "Your trading area", surface: "pro",
    blurb: "A guided tour of the trading screen: everything on one screen.",
    steps: [
      { title: "The trading area", text: "Everything on one screen, and time that moves. It's the same depot as in the web cabinet. After World 2 you move on to ProTrader." },
      { target: "w-account", title: "Your account", text: "Total value, cash and profit or loss. Low on cash? Top up here." },
      { target: "w-search", title: "Find a stock", text: "Type a name, ticker or WKN, then pick the stock from the list.", task: "Search for SAP and pick it.", done: (c) => c.ui.sym === "SAP" },
      { target: "w-chart", title: "Chart", text: "Candles: each one is one day. Green closed higher, red lower. Your trades show up as arrows." },
      { target: "w-ticket", title: "Order ticket", text: "Buy or sell, quantity, order type and costs, always in view.", task: "Enter a quantity of 5.", done: (c) => c.ui.qty === 5 },
      { target: "w-depot", title: "Positions and orders", text: "What you own, and your limit and stop orders waiting for their price." },
      { target: "w-news", title: "News", text: "Simulated macro and sector news. Big headlines pause the time." },
      { target: "time-machine", title: "Time", text: "Play moves the market day by day. Pick 1 day/s or 1 week/s.", task: "Press Play.", done: (c) => (c.ui.dayDelta as number ?? 0) >= 1 },
    ],
  },
  {
    id: "2.2", world: 2, n: "2.2", kind: "chapter", title: "Not every headline matters", surface: "pro", card: ["signal-noise"], replay: "vw",
    blurb: "A historical replay: which headlines were signal, which were noise?",
    steps: [
      { title: "A real story, date hidden", text: "This really happened. You see the company type, not the name or the date. Watch the headlines and the price." },
      { target: "time-machine", title: "Play", text: "Headlines arrive as time moves. Big ones pause the game.", task: "Press Play.", done: (c) => (c.ui.day as number ?? 0) >= 1 },
      { target: "w-news", title: "First headline", text: "A motor show with record crowds.",
        quiz: { q: "Is \"Motor show opens with record crowds\" a signal for one carmaker's share?", options: ["Signal: new information about the company", "Noise: nothing about the business changed"], answer: 1, why: "Nice for Frankfurt, nothing new about any carmaker's profits." } },
      { target: "time-machine", title: "Keep going", text: "Something bigger is coming.", task: "Press Play until the US agency headline appears.", done: (c) => (c.ui.day as number ?? 0) >= 4 },
      { target: "w-chart", title: "Look at the chart", text: "The share fell about 19 % in one day.",
        quiz: { q: "\"US agency: carmaker cheated on emission tests\". Signal or noise?", options: ["Signal: fines, recalls, lost trust", "Noise: just a headline"], answer: 0, why: "Real, new and serious information about this company's future." } },
      { target: "time-machine", title: "Two days later", text: "Watch what the TV analyst says.", task: "Press Play until day 6.", done: (c) => (c.ui.day as number ?? 0) >= 6 },
      { target: "w-news", title: "Opinions", text: "Now a TV analyst says the whole sector is finished.",
        quiz: { q: "\"The whole auto sector is finished\", says an analyst on TV. Signal or noise?", options: ["Signal", "Noise: a dramatic opinion"], answer: 1, why: "Other carmakers fell much less. The problem was at one company." } },
      { title: "The reveal: Volkswagen, September 2015", text: "\"Dieselgate\". The share lost about a third in a few days. Other carmakers fell much less: the signal was about one company, the TV drama was noise." },
    ],
  },
  {
    id: "2.3", world: 2, n: "2.3", kind: "chapter", title: "The market was faster", surface: "pro", card: ["priced-in"], lesson: "priced",
    blurb: "Why expected news barely moves prices.",
    steps: [
      { title: "Simulated week", text: "A simulated week with central bank news. Watch the MSCI World ETF." },
      { target: "time-machine", title: "Play", text: "Everyone reads the same forecasts.", task: "Press Play until the ECB decision.", done: (c) => (c.ui.day as number ?? 0) >= 4 },
      { target: "w-chart", title: "Nothing happened?", text: "The decision was big news, but the price barely moved.",
        quiz: { q: "Why didn't the ECB decision move prices?", options: ["Everyone expected it: it was priced in", "Nobody read it", "Markets were closed"], answer: 0, why: "Prices react to surprises. Expected news is already in the price." } },
      { target: "time-machine", title: "Now a surprise", text: "Keep going.", task: "Press Play.", done: (c) => (c.ui.day as number ?? 0) >= 7 },
      { target: "w-chart", title: "A surprise moves prices", text: "Inflation fell more than expected. This time prices moved, because it was new." },
    ],
  },
  {
    id: "2.4", world: 2, n: "2.4", kind: "chapter", title: "Rumors", surface: "pro", card: ["rumor"], lesson: "rumor",
    blurb: "Buy the rumor, sell the news.",
    steps: [
      { title: "Sources say…", text: "Simulated: a rumor about a purchase bonus for electric cars. Watch the car stocks." },
      { target: "w-search", title: "Car stocks", text: "Pick a carmaker to follow.", task: "Search for Volkswagen and pick it.", done: (c) => c.ui.sym === "VOW3" },
      { target: "time-machine", title: "The rumor", text: "Let's hear it.", task: "Press Play.", done: (c) => (c.ui.day as number ?? 0) >= 2 },
      { target: "w-news", title: "Unconfirmed", text: "\"Sources say\" means nobody confirmed it.",
        quiz: { q: "Car stocks jump on \"sources say\". What's the risk?", options: ["None, it's in the news", "The price falls if the rumor is wrong", "The stock gets delisted"], answer: 1, why: "A rumor can be wrong. Then the hope leaves the price again." } },
      { target: "time-machine", title: "And then", text: "Keep going.", task: "Press Play until the government answers.", done: (c) => (c.ui.day as number ?? 0) >= 7 },
      { target: "w-chart", title: "Denied", text: "The government said no. The jump is gone, and then some. Whoever bought the rumor lost money." },
    ],
  },
  {
    id: "w2", world: 2, n: "★", kind: "mission", title: "Read before you click", surface: "pro", lesson: "w2",
    blurb: "Three headlines in one simulated week. Act or ignore?",
    mission: {
      goal: () => "Three headlines come in over one simulated week. For each one, decide: act or ignore.",
      hint: () => "Ask: is this new information about the business, or an opinion or something everyone already expected?",
      check: (c) => (c.ui.w2Answered as number ?? 0) >= 3,
      smart: (c) => (c.ui.w2Right as number ?? 0) >= 3,
      smartLabel: "All three right",
    },
  },
  { id: "b2", world: 2, n: "👾", kind: "boss", title: "Boss: FOMO Max", surface: "pro", replay: "gamestop", card: ["rumor"], blurb: "A historical replay. Don't buy the hype." },
];

// ── World 3 · Risk ────────────────────────────────────────────────────────

const W3: Chapter[] = [
  {
    id: "3.1", world: 3, n: "3.1", kind: "chapter", title: "Ups and downs", surface: "pro", card: ["volatility"], replay: "nvidia",
    blurb: "A replay where a bad habit wins. Luck or skill?",
    steps: [
      { title: "One year, one chipmaker", text: "A real year, date hidden. All-in Alex puts everything in one stock. Watch how wild the ride is." },
      { target: "time-machine", title: "Fast-forward", text: "Use the jumps to move a month at a time.", task: "Jump +1 month three times.", done: (c) => (c.ui.day as number ?? 0) >= 60 },
      { target: "w-chart", title: "Swings", text: "Big moves both ways. That's volatility." },
      { target: "time-machine", title: "Keep going", text: "Let's see the rest of the year.", task: "Play until the end of the replay.", done: (c) => !!c.ui.ended },
      { title: "Alex won", text: "Alex's one stock more than tripled.",
        quiz: { q: "Alex won with an all-in bet. Was it a good decision?", options: ["Yes, he made the most money", "It worked in spite of the strategy, not because of it", "Yes, AI always wins"], answer: 1, why: "Same habit, same risk as with Wirecard. A bad habit can win in the short run." } },
      { target: "reveal-banner", title: "The reveal: NVIDIA, 2023", text: "The share more than tripled, with drops of 15–20 % on the way. Big swings in both directions: that's volatility, and the drawdowns are what you have to sit through." },
    ],
  },
  {
    id: "3.2", world: 3, n: "3.2", kind: "chapter", title: "One basket", surface: "pro", card: ["diversification"],
    blurb: "Why one bad company shouldn't be able to ruin you.",
    steps: [
      { title: "Eggs and baskets", text: "Drop a few years and watch what happens to one basket versus ten.", game: "eggs" },
      { target: "w-depot", title: "Your depot", text: "Look at the weight of each position: how much of your depot is in one stock?" },
      { title: "The rule of thumb", text: "Many investors keep any single stock below 10–30 % of their depot.",
        quiz: { q: "Your depot is 80 % one stock. If it falls 50 %, your depot falls about…", options: ["5 %", "40 %", "80 %"], answer: 1, why: "80 % × 50 % = 40 %. Concentration multiplies one company's problem." } },
    ],
  },
  {
    id: "3.3", world: 3, n: "3.3", kind: "chapter", title: "Hundreds of companies in one click", surface: "pro", card: ["etf"],
    blurb: "What an ETF is, and why it's the cheap way to diversify.",
    steps: [
      { title: "One order, 1.400 companies", text: "Move the slider: see where your money goes in an MSCI World ETF.", game: "basket" },
      { target: "w-watchlist", title: "Find the ETF", text: "The MSCI World ETF is in your watchlist.", task: "Click the MSCI World ETF.", done: (c) => c.ui.sym === ETF_SYM },
      { target: "w-chart", title: "Calmer", text: "Compare the candles: an ETF usually swings much less than a single stock." },
      { title: "Fees", text: "With small amounts, fees matter.",
        quiz: { q: "You have 100 €. Four single stocks or one ETF?", options: ["Four stocks: 4 × 4,90 € ≈ 20 % in fees", "One ETF: one fee, about 1.400 companies"], answer: 1, why: "One ETF order spreads your money widely for one fee." } },
    ],
  },
  {
    id: "w3", world: 3, n: "★", kind: "mission", title: "Don't put all eggs in one basket", surface: "pro",
    blurb: "Spread your money so no single stock is above 30 %.",
    mission: {
      goal: () => "Invest at least half of your money so that no single stock is above 30 % of your depot. An ETF counts as diversified. Watch the fees.",
      hint: () => "One ETF order is the cheapest way: Order → MSCI World ETF (A0RPWH). Not enough money for one share? The sandbox \"+ Play money\" button tops up your trading account. Selling a single stock also frees money.",
      check: (c) => {
        const s = c.save.sim, total = totalValue(s), dep = depotValue(s);
        if (!(total > 0) || dep < total * 0.5) return false;
        return Object.entries(s.acct.holdings).every(([sym, h]) => companyOf(sym).type === "ETF" || (h.qty * priceNow(s, sym)) / dep <= 0.3);
      },
      smart: (c) => c.save.sim.acct.trades.filter((t) => t.side === "buy").length <= 3,
      smartLabel: "Few orders, low fees",
    },
  },
  { id: "b3", world: 3, n: "👾", kind: "boss", title: "Boss: All-in Alex", surface: "pro", replay: "wirecard", card: ["diversification"], blurb: "A historical replay. Keep a diversified depot." },
];

// ── World 4 · Time ────────────────────────────────────────────────────────

const W4: Chapter[] = [
  {
    id: "4.1", world: 4, n: "4.1", kind: "chapter", title: "Money that grows on its own", surface: "pro", card: ["compound"],
    blurb: "Compound interest, made visible.",
    steps: [
      { title: "The snowball", text: "Move the years: your gains start earning their own gains.", game: "snowball" },
      { target: "time-machine", title: "Years, not days", text: "World 4 unlocks +1 year and +10 years in the time machine." },
      { title: "Check", text: "One more question.",
        quiz: { q: "Two people save the same monthly amount. One starts at 25, one at 35. Who ends up with more at 65?", options: ["The one who started at 25, by a lot", "About the same", "The one who started later"], answer: 0, why: "Ten extra years of compounding often matter more than the amount." } },
    ],
  },
  {
    id: "4.2", world: 4, n: "4.2", kind: "chapter", title: "Same amount, every month", surface: "pro", card: ["savings-plan"], lesson: "plan",
    blurb: "Set up a savings plan and fast-forward.",
    steps: [
      { title: "A savings plan", text: "Same amount every month, automatically. No timing, no stress." },
      { target: "pt-order", title: "Open the order window", text: "Savings plans are set up in the order window.", task: "Open the order window.", done: (c) => !!c.ui.orderOpen },
      { target: "w-order-plan", title: "Savings plan tab", text: "Switch to the savings plan tab.", task: (c) => `Set up a ${PERSONAS[c.save.persona ?? "starter"].plan} €/month plan on the ETF.`, done: (c) => !!c.ui.planSet },
      { target: "time-machine", title: "Fast-forward", text: "Now let time work.", task: "Jump +1 year three times.", done: (c) => (c.ui.day as number ?? 0) >= 750 },
      { target: "w-depot", title: "Cost averaging", text: "In the bad year your plan bought more shares for the same money. That's the cost-average effect." },
    ],
  },
  {
    id: "w4", world: 4, n: "★", kind: "mission", title: "Set and forget", surface: "pro", lesson: "plan",
    blurb: "Savings plan on an ETF, then ⏩ 10 years.",
    mission: {
      goal: (c) => `Set up a ${persona(c).plan} €/month savings plan on the MSCI World ETF, then fast-forward 10 years.`,
      hint: () => "Order → \"Savings plan\" tab → amount → Set up. Then press +10 years in the time machine.",
      check: (c) => (c.ui.day as number ?? 0) >= 2500 && (c.ui.planSet as boolean),
      smart: (c) => !c.save.sim.acct.trades.some((t) => t.side === "sell"),
      smartLabel: "Never sold",
    },
  },
  { id: "b4", world: 4, n: "👾", kind: "boss", title: "Boss: Panic Paula", surface: "pro", replay: "covid", card: ["volatility"], blurb: "A historical replay, fast-forwarded. Stay calm." },
];

export const CHAPTERS: Chapter[] = [...W1, ...W2, ...W3, ...W4];
export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);
/** A world unlocks when the previous world's mission is done (idea.md §4.3). */
export const worldOpen = (save: Save, n: number) => save.allUnlocked || n === 1 || save.done.includes(`w${n - 1}`);

/** Inside a world: chapters in any order; the mission needs the chapters; the boss needs the mission. */
export function isOpen(save: Save, ch: Chapter): boolean {
  if (save.allUnlocked) return true;
  if (!worldOpen(save, ch.world)) return false;
  const list = CHAPTERS.filter((c) => c.world === ch.world);
  if (ch.kind === "chapter") return true;
  if (ch.kind === "mission") return list.filter((c) => c.kind === "chapter").every((c) => save.done.includes(c.id));
  return save.done.includes(`w${ch.world}`);
}

export const nextChapter = (save: Save) => CHAPTERS.find((c) => !save.done.includes(c.id) && isOpen(save, c));
export const surfaceHref = (ch: Chapter) => (ch.surface === "cabinet" ? "/cabinet" : "/pro");
export { costBasis, DAX_ETF };
