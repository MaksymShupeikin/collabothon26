import { ETF_SYM, type Company } from "./data/companies.ts";
import { generateNews } from "./news.ts";
import { gauss, rng } from "./rng.ts";

export type Effect = { target: string; from: number; days: number; total: number }; // target: SYM | "sector:X" | "*"
export type NewsKind = "signal" | "priced_in" | "miss" | "rumor" | "sector" | "macro" | "delayed" | "noise";
export type News = {
  id: number; day: number; kind: NewsKind; sym?: string; headline: string;
  tone: -1 | 0 | 1; // how it *sounds*, not what it does
  major: boolean; effects: Effect[]; explain: string; concept: string;
};
export type Side = "buy" | "sell";
export type Holding = { qty: number; cost: number }; // cost = total paid incl. fees
export type Trade = { day: number; sym: string; side: Side; qty: number; price: number; fee: number };
export type Trader = { id: string; name: string; cash: number; holdings: Record<string, Holding>; values: number[]; trades: Trade[] };
export type OrderType = "market" | "limit" | "stop";
export type Order = { id: number; sym: string; side: Side; qty: number; type: OrderType; limit: number };
export type BotCall = {
  id: number; bot: string; day: number; sym: string; side: Side; price: number;
  reason: string; newsId?: number; guess?: boolean; result?: { price: number; right: boolean };
};
export type Market = {
  seed: number; day: number; days: number; companies: Company[];
  prices: Record<string, number[]>; news: News[];
  player: Trader; bots: Trader[]; orders: Order[]; calls: BotCall[]; nextId: number;
};

export const START_CASH = 10_000;
export const FEE_FIXED = 4.9; // mock comdirect-like order fee
export const FEE_RATE = 0.0025;
export const SPREAD = 0.001; // half-spread: buy above, sell below the mid price
export const CALL_HORIZON = 10; // days until a bot's call is judged

export const BOTS = [
  { id: "max", name: "FOMO Max", habit: "Buys every rumor and hype", concept: "rumor" },
  { id: "paula", name: "Panic Paula", habit: "Sells everything when the portfolio drops", concept: "drawdown" },
  { id: "alex", name: "All-in Alex", habit: "Puts everything into one stock", concept: "diversification" },
  { id: "dan", name: "Day-trader Dan", habit: "Trades constantly", concept: "fees" },
  { id: "hanna", name: "Headline Hanna", habit: "Reacts to every headline", concept: "priced-in" },
  { id: "sam", name: "Steady Sam", habit: "Monthly ETF savings plan, never sells", concept: "savings-plan" },
] as const;

export const round2 = (x: number) => Math.round(x * 100) / 100;
export const fee = (volume: number) => round2(FEE_FIXED + volume * FEE_RATE);
export const priceOf = (m: Market, sym: string, day = m.day) => m.prices[sym][day];

const newTrader = (id: string, name: string): Trader => ({ id, name, cash: START_CASH, holdings: {}, values: [START_CASH], trades: [] });

export function createMarket(seed: number, companies: Company[], days = 120): Market {
  const prices: Record<string, number[]> = {};
  for (const c of companies) prices[c.sym] = [c.price];
  return {
    seed, day: 0, days, companies, prices,
    news: generateNews(companies, days, seed),
    player: newTrader("you", "You"),
    bots: BOTS.map((b) => newTrader(b.id, b.name)),
    orders: [], calls: [], nextId: 1,
  };
}

/** Executes a trade in place. Returns an error message, or null on success. */
export function trade(t: Trader, sym: string, side: Side, qty: number, mid: number, day: number): string | null {
  if (!Number.isInteger(qty) || qty <= 0) return "Quantity must be a whole number above 0.";
  const price = round2(side === "buy" ? mid * (1 + SPREAD) : mid * (1 - SPREAD));
  const volume = round2(qty * price);
  const f = fee(volume);
  const h = t.holdings[sym] ?? { qty: 0, cost: 0 };
  if (side === "buy") {
    if (volume + f > t.cash + 1e-9) return "Not enough cash for this order (incl. fee).";
    t.cash = round2(t.cash - volume - f);
    t.holdings[sym] = { qty: h.qty + qty, cost: round2(h.cost + volume + f) };
  } else {
    if (qty > h.qty) return "You can't sell more than you own.";
    t.cash = round2(t.cash + volume - f);
    const left = h.qty - qty;
    if (left === 0) delete t.holdings[sym];
    else t.holdings[sym] = { qty: left, cost: round2((h.cost * left) / h.qty) };
  }
  t.trades.push({ day, sym, side, qty, price, fee: f });
  return null;
}

export const valueOf = (m: Market, t: Trader, day = m.day) =>
  round2(t.cash + Object.entries(t.holdings).reduce((s, [sym, h]) => s + h.qty * m.prices[sym][day], 0));

export function maxDrawdown(values: number[]): number {
  let peak = values[0], dd = 0;
  for (const v of values) { peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak); }
  return dd;
}

/** Return minus half the worst drawdown — all-in gambling rarely wins this. */
export const riskScore = (values: number[]) =>
  round2(((values[values.length - 1] / values[0] - 1) - 0.5 * maxDrawdown(values)) * 100);

/** Player order. Market orders fill now; limit/stop orders wait for the price. */
export function placeOrder(prev: Market, o: Omit<Order, "id">): { m: Market; error: string | null } {
  const m = structuredClone(prev);
  if (o.type === "market") {
    const error = trade(m.player, o.sym, o.side, o.qty, priceOf(m, o.sym), m.day);
    return { m: error ? prev : m, error };
  }
  if (!(o.limit > 0)) return { m: prev, error: "Enter a price for limit/stop orders." };
  m.orders.push({ ...o, id: m.nextId++ });
  return { m, error: null };
}

/** Adds play money. Past values shift by the same amount so returns and the chart don't count the deposit as profit. */
export function topUp(prev: Market, amount: number): Market {
  if (!(amount > 0)) return prev;
  const m = structuredClone(prev);
  m.player.cash = round2(m.player.cash + amount);
  m.player.values = m.player.values.map((v) => round2(v + amount));
  return m;
}

export const cancelOrder = (prev: Market, id: number): Market => ({ ...prev, orders: prev.orders.filter((o) => o.id !== id) });

export function guessCall(prev: Market, id: number, guess: boolean): Market {
  return { ...prev, calls: prev.calls.map((c) => (c.id === id && c.guess === undefined ? { ...c, guess } : c)) };
}

function effectFor(news: News[], c: Company, d: number): number {
  let sum = 0;
  for (const n of news) for (const e of n.effects) {
    if (d < e.from || d >= e.from + e.days) continue;
    if (e.target === c.sym || e.target === "*" || e.target === `sector:${c.sector}`) sum += e.total / e.days;
  }
  return sum;
}

/** Advances the market by one day: prices, pending orders, bots, call results, values. */
export function tick(prev: Market): Market {
  if (prev.day >= prev.days) return prev;
  const m = structuredClone(prev);
  const d = ++m.day;
  const r = rng(m.seed * 7919 + d);
  const rets: number[] = [];
  for (const c of m.companies) {
    if (c.sector === "ETF") continue;
    const ret = Math.max(-0.5, c.drift + c.vol * gauss(r) + effectFor(m.news, c, d));
    rets.push(ret);
    m.prices[c.sym].push(round2(priceOf(m, c.sym, d - 1) * (1 + ret)));
  }
  // The ETF holds "the whole market": its move is the average move, so single-stock shocks barely show.
  const etfRet = rets.reduce((a, b) => a + b, 0) / rets.length;
  m.prices[ETF_SYM].push(round2(priceOf(m, ETF_SYM, d - 1) * (1 + etfRet)));

  m.orders = m.orders.filter((o) => {
    const p = priceOf(m, o.sym);
    const hit = o.type === "limit" ? (o.side === "buy" ? p <= o.limit : p >= o.limit) : (o.side === "sell" ? p <= o.limit : p >= o.limit);
    if (!hit) return true;
    trade(m.player, o.sym, o.side, o.qty, p, d); // a failed fill (no cash) just drops the order
    return false;
  });

  botsAct(m, d);

  for (const c of m.calls) {
    if (c.result || d - c.day < CALL_HORIZON) continue;
    const now = priceOf(m, c.sym);
    c.result = { price: now, right: c.side === "buy" ? now > c.price : now < c.price };
  }

  for (const t of [m.player, ...m.bots]) t.values.push(valueOf(m, t));
  return m;
}

function botsAct(m: Market, d: number) {
  const today = m.news.filter((n) => n.day === d);
  const bot = (id: string) => m.bots.find((b) => b.id === id)!;
  const p = (sym: string) => priceOf(m, sym);
  const maxQty = (t: Trader, sym: string, share: number) => Math.floor((t.cash * share - FEE_FIXED) / (p(sym) * (1 + SPREAD + FEE_RATE)));
  const buy = (t: Trader, sym: string, share: number) => { const q = maxQty(t, sym, share); return q > 0 && !trade(t, sym, "buy", q, p(sym), d); };
  const sellAll = (t: Trader, sym: string) => { const h = t.holdings[sym]; return !!h && !trade(t, sym, "sell", h.qty, p(sym), d); };
  const call = (botId: string, sym: string, side: Side, reason: string, newsId?: number) =>
    m.calls.push({ id: m.nextId++, bot: botId, day: d, sym, side, price: p(sym), reason, newsId });
  const stocks = m.companies.filter((c) => c.sector !== "ETF");

  // FOMO Max: jumps on every rumor/hype headline, takes profit +10% or panics at -15%.
  const max = bot("max");
  for (const n of today) {
    if (n.sym && n.major && n.tone > 0 && (n.kind === "rumor" || n.kind === "noise" || n.kind === "signal") && buy(max, n.sym, 0.5))
      call("max", n.sym, "buy", `"${n.headline}" — gotta buy before it's too late!`, n.id);
  }
  for (const [sym, h] of Object.entries(max.holdings)) {
    const avg = h.cost / h.qty;
    if (p(sym) >= avg * 1.1 || p(sym) <= avg * 0.85) sellAll(max, sym);
  }

  // Panic Paula: diversified at first, dumps everything after an 8% drop, buys back after a rally.
  const paula = bot("paula");
  if (d === 1) for (const sym of [ETF_SYM, "SAP", "AAPL", "ALV"]) buy(paula, sym, Math.min(1, 2400 / paula.cash));
  const pv = valueOf(m, paula);
  const lastBuy = paula.trades.filter((t) => t.side === "buy").at(-1)?.day ?? 0;
  const peak = Math.max(...paula.values.slice(lastBuy), pv); // peak since she last got in
  const invested = Object.keys(paula.holdings).length > 0;
  if (invested && pv < peak * 0.92) {
    const biggest = Object.keys(paula.holdings)[0];
    call("paula", biggest, "sell", "My portfolio is down 8%! Get me out of everything!");
    for (const sym of Object.keys(paula.holdings)) sellAll(paula, sym);
  } else if (!invested && d > 10 && p(ETF_SYM) > priceOf(m, ETF_SYM, d - 10) * 1.04) {
    if (buy(paula, ETF_SYM, 0.98)) call("paula", ETF_SYM, "buy", "It's been rising for two weeks — safe to get back in now!");
  }

  // All-in Alex: everything into one hot stock, forever.
  if (d === 1) buy(bot("alex"), "NVDA", 0.99);

  // Day-trader Dan: rotates into a random stock every 3 days, paying fees and spreads each time.
  const dan = bot("dan");
  if (d % 3 === 1) {
    for (const sym of Object.keys(dan.holdings)) sellAll(dan, sym);
    buy(dan, stocks[Math.floor(rng(m.seed + d * 31)() * stocks.length)].sym, 0.95);
  }

  // Headline Hanna: buys on anything that sounds good, sells on anything that sounds bad — noise included.
  const hanna = bot("hanna");
  for (const n of today) {
    if (!n.sym) continue;
    if (n.tone > 0 && buy(hanna, n.sym, 0.2)) { if (n.major) call("hanna", n.sym, "buy", `"${n.headline}" sounds great!`, n.id); }
    else if (n.tone < 0 && sellAll(hanna, n.sym) && n.major) call("hanna", n.sym, "sell", `"${n.headline}" sounds bad — sell!`, n.id);
  }

  // Steady Sam: invests a sixth of his start cash into the ETF every 20 days and never sells.
  const sam = bot("sam");
  if (d % 20 === 1) { const q = maxQty(sam, ETF_SYM, Math.min(1, START_CASH / 6 / sam.cash)); if (q > 0) trade(sam, ETF_SYM, "buy", q, p(ETF_SYM), d); }
}
