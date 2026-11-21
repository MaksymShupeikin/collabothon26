import { ALL_COMPANIES, type Company } from "./companies.ts";
import type { News } from "./news.ts";
import { gauss, rng } from "../../shared/lib/rng.ts";

/**
 * Deterministic market + one player account.
 * Prices depend only on the universe (seed, companies, scripted paths, news), never on the player,
 * so we persist only the account and recompute prices on load.
 */

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type Validity = "day" | "ultimo" | "max";
export type Holding = { qty: number; cost: number }; // cost = total paid incl. fees
export type Trade = { day: number; sym: string; side: Side; qty: number; price: number; fee: number; type: OrderType; exchange: string };
export type Order = { id: number; sym: string; side: Side; qty: number; type: OrderType; limit: number; validity: Validity; placed: number; exchange: string };
export type Plan = { sym: string; amount: number; from: number };
export type Account = {
  cash: number; // Verrechnungskonto
  holdings: Record<string, Holding>;
  trades: Trade[];
  orders: Order[];
  plans: Plan[];
  values: number[]; // total value (cash + depot) at the end of each game day, index = game day
  deposits: number[]; // cumulative play money added up to each day (so top-ups don't count as profit)
  nextId: number;
};
export type Sim = { universe: string; day: number; acct: Account };

/** A scripted price path: [game day, price] keypoints; the path passes exactly through them. */
export type Path = [number, number][];
export type Universe = {
  id: string;
  seed: number;
  syms: string[];
  days: number; // playable game days (0..days)
  history: number; // trading days of pre-history for the charts
  paths?: Record<string, Path>;
  news: News[];
  etf?: { sym: string; of: string[] }; // ETF price = average daily move of these
  startDate: string; // ISO date of game day 0 (a weekday)
  hideDate?: boolean; // historical replays hide the real date until the reveal
};

export const FEE_FIXED = 4.9;
export const FEE_RATE = 0.0025;
export const SPREAD = 0.001; // half-spread around the mid price
export const PLAN_FEE_RATE = 0.015; // savings plan: 1.5 % per execution, no fixed fee
export const PLAN_EVERY = 21; // trading days per month

export const round2 = (x: number) => Math.round(x * 100) / 100;
export const fee = (volume: number) => round2(FEE_FIXED + volume * FEE_RATE);
export const ask = (mid: number) => round2(mid * (1 + SPREAD));
export const bid = (mid: number) => round2(mid * (1 - SPREAD));

// ── Universe registry + price cache ────────────────────────────────────────

const universes = new Map<string, Universe>();
const priceCache = new Map<string, Record<string, number[]>>();
export const registerUniverse = (u: Universe) => { universes.set(u.id, u); priceCache.delete(u.id); };
export const universeOf = (id: string) => {
  const u = universes.get(id);
  if (!u) throw new Error(`Unknown universe ${id}`);
  return u;
};
export const companiesOf = (u: Universe): Company[] => u.syms.map((s) => ALL_COMPANIES.find((c) => c.sym === s)!);

function effectOn(u: Universe, c: Company, d: number): number {
  let sum = 0;
  for (const n of u.news) for (const e of n.effects) {
    if (d < e.from || d >= e.from + e.days) continue;
    if (e.target === c.sym || e.target === "*" || e.target === `sector:${c.sector}`) sum += e.total / e.days;
  }
  return sum;
}

function pathPrice(path: Path, d: number, noise: number): number {
  if (d <= path[0][0]) return path[0][1];
  for (let k = 1; k < path.length; k++) {
    const [d1, p1] = path[k], [d0, p0] = path[k - 1];
    if (d <= d1) {
      const f = (d - d0) / (d1 - d0);
      const base = p0 * Math.pow(p1 / p0, f); // geometric interpolation
      return base * (1 + noise * Math.sin(Math.PI * f)); // noise vanishes at the keypoints
    }
  }
  return path[path.length - 1][1];
}

/** Full price arrays, index = history + game day. Pre-history is a backwards random walk. */
export function pricesOf(u: Universe): Record<string, number[]> {
  const cached = priceCache.get(u.id);
  if (cached) return cached;
  const out: Record<string, number[]> = {};
  const H = u.history, N = H + u.days + 1;
  const comps = companiesOf(u);
  const rets: Record<string, number[]> = {};
  comps.forEach((c, ci) => {
    const r = rng(u.seed * 7919 + ci * 104729);
    const arr = new Array<number>(N);
    const path = u.paths?.[c.sym];
    const p0 = path ? path[0][1] : c.price;
    arr[H] = p0;
    for (let i = H - 1; i >= 0; i--) arr[i] = arr[i + 1] / (1 + c.drift + c.vol * gauss(r));
    let smooth = 0;
    for (let d = 1; d <= u.days; d++) {
      if (path) {
        smooth = 0.7 * smooth + 0.3 * gauss(r);
        arr[H + d] = pathPrice(path, d, c.vol * 2.2 * smooth);
      } else {
        const ret = Math.max(-0.5, c.drift + c.vol * gauss(r) + effectOn(u, c, d));
        arr[H + d] = arr[H + d - 1] * (1 + ret);
      }
    }
    rets[c.sym] = arr.map((p, i) => (i ? p / arr[i - 1] - 1 : 0));
    out[c.sym] = arr;
  });
  if (u.etf && !u.paths?.[u.etf.sym]) {
    const c = comps.find((x) => x.sym === u.etf!.sym)!;
    const arr = new Array<number>(N);
    const base = c.price || 100;
    arr[H] = base;
    const avg = (i: number) => u.etf!.of.reduce((s, sym) => s + rets[sym][i], 0) / u.etf!.of.length;
    for (let i = H + 1; i < N; i++) arr[i] = arr[i - 1] * (1 + avg(i));
    for (let i = H - 1; i >= 0; i--) arr[i] = arr[i + 1] / (1 + avg(i + 1));
    out[c.sym] = arr;
  }
  for (const k of Object.keys(out)) out[k] = out[k].map(round2);
  priceCache.set(u.id, out);
  return out;
}

/** Mid price on a game day (negative days reach into the pre-history). */
export const priceAt = (u: Universe, sym: string, day: number) => pricesOf(u)[sym][u.history + Math.max(-u.history, Math.min(day, u.days))];
export const priceNow = (s: Sim, sym: string) => priceAt(universeOf(s.universe), sym, s.day);

// ── Calendar ──────────────────────────────────────────────────────────────

/** Game day → calendar date, skipping weekends. Negative days go back in time. */
export function dateOf(u: Universe, day: number): Date {
  const d = new Date(u.startDate + "T00:00:00Z");
  let n = Math.abs(day);
  const step = day < 0 ? -1 : 1;
  while (n > 0) { d.setUTCDate(d.getUTCDate() + step); if (d.getUTCDay() % 6) n--; }
  return d;
}

// ── Account ───────────────────────────────────────────────────────────────

export function newAccount(cash: number): Account {
  return { cash, holdings: {}, trades: [], orders: [], plans: [], values: [cash], deposits: [cash], nextId: 1 };
}
export const newSim = (universe: string, cash: number): Sim => ({ universe, day: 0, acct: newAccount(cash) });

export const depotValue = (s: Sim, day = s.day) => {
  const u = universeOf(s.universe);
  return round2(Object.entries(s.acct.holdings).reduce((v, [sym, h]) => v + h.qty * priceAt(u, sym, day), 0));
};
export const totalValue = (s: Sim) => round2(s.acct.cash + depotValue(s));
export const costBasis = (s: Sim) => round2(Object.values(s.acct.holdings).reduce((v, h) => v + h.cost, 0));

/** Executes a trade in place. Returns an error message, or null on success. */
export function execute(a: Account, sym: string, side: Side, qty: number, mid: number, day: number, type: OrderType = "market", exchange = "Xetra"): string | null {
  if (!Number.isInteger(qty) || qty <= 0) return "Quantity must be a whole number above 0.";
  const price = side === "buy" ? ask(mid) : bid(mid);
  const volume = round2(qty * price);
  const f = fee(volume);
  const h = a.holdings[sym] ?? { qty: 0, cost: 0 };
  if (side === "buy") {
    if (volume + f > a.cash + 1e-9) return "Not enough money on your trading account for this order (incl. costs).";
    a.cash = round2(a.cash - volume - f);
    a.holdings[sym] = { qty: h.qty + qty, cost: round2(h.cost + volume + f) };
  } else {
    if (qty > h.qty) return "You can't sell more than you own.";
    a.cash = round2(a.cash + volume - f);
    const left = h.qty - qty;
    if (left === 0) delete a.holdings[sym];
    else a.holdings[sym] = { qty: left, cost: round2((h.cost * left) / h.qty) };
  }
  a.trades.push({ day, sym, side, qty, price, fee: f, type, exchange });
  return null;
}

export type OrderInput = { sym: string; side: Side; qty: number; type: OrderType; limit?: number; validity?: Validity; exchange?: string };
export type OrderResult = { sim: Sim; error: string | null; filled: Trade | null };

/** Market orders fill now. A marketable limit order fills now too; otherwise it waits in the order book. */
export function placeOrder(prev: Sim, o: OrderInput): OrderResult {
  const s = structuredClone(prev);
  const mid = priceNow(s, o.sym);
  const exchange = o.exchange ?? "Xetra";
  if (!Number.isInteger(o.qty) || o.qty <= 0) return { sim: prev, error: "Enter a whole number of shares.", filled: null };
  if (o.type !== "market" && !(Number(o.limit) > 0)) return { sim: prev, error: o.type === "limit" ? "Enter a limit price." : "Enter a stop price.", filled: null };
  const marketable = o.type === "market"
    || (o.type === "limit" && (o.side === "buy" ? o.limit! >= ask(mid) : o.limit! <= bid(mid)));
  if (marketable) {
    const err = execute(s.acct, o.sym, o.side, o.qty, mid, s.day, o.type, exchange);
    return err ? { sim: prev, error: err, filled: null } : { sim: s, error: null, filled: s.acct.trades.at(-1)! };
  }
  if (o.side === "sell" && (s.acct.holdings[o.sym]?.qty ?? 0) < o.qty) return { sim: prev, error: "You can't sell more than you own.", filled: null };
  if (o.side === "buy" && o.qty * o.limit! + fee(o.qty * o.limit!) > s.acct.cash) return { sim: prev, error: "Not enough money on your trading account for this order (incl. costs).", filled: null };
  s.acct.orders.push({ id: s.acct.nextId++, sym: o.sym, side: o.side, qty: o.qty, type: o.type, limit: o.limit!, validity: o.validity ?? "day", placed: s.day, exchange });
  return { sim: s, error: null, filled: null };
}

export const cancelOrder = (prev: Sim, id: number): Sim => ({ ...prev, acct: { ...prev.acct, orders: prev.acct.orders.filter((o) => o.id !== id) } });

/** Adds play money to the trading account without counting it as profit. */
export function deposit(prev: Sim, amount: number): Sim {
  if (!amount || (amount < 0 && -amount > prev.acct.cash + 1e-9)) return prev;
  const s = structuredClone(prev);
  s.acct.cash = round2(s.acct.cash + amount);
  s.acct.deposits[s.day] = round2((s.acct.deposits[s.day] ?? 0) + amount);
  s.acct.values[s.day] = round2((s.acct.values[s.day] ?? 0) + amount);
  return s;
}
/** Moves money out of the trading account (back to the Girokonto). */
export const withdraw = (prev: Sim, amount: number): Sim => (amount > 0 ? deposit(prev, -amount) : prev);

export const addPlan = (prev: Sim, plan: Omit<Plan, "from">): Sim => {
  const s = structuredClone(prev);
  s.acct.plans = [...s.acct.plans.filter((p) => p.sym !== plan.sym), { ...plan, from: s.day }];
  return s;
};

export type SimEvent =
  | { kind: "fill"; day: number; trade: Trade; order: Order }
  | { kind: "expired"; day: number; order: Order }
  | { kind: "plan"; day: number; sym: string; qty: number; amount: number }
  | { kind: "news"; day: number; news: News };

/**
 * Moves time forward up to `days` trading days, in place on one clone.
 * Stops early on a major headline when `stopAtMajor` (the time machine auto-pauses on big news).
 */
export function advance(prev: Sim, days: number, opts: { stopAtMajor?: boolean } = {}): { sim: Sim; events: SimEvent[] } {
  const u = universeOf(prev.universe);
  const s = structuredClone(prev);
  const a = s.acct;
  const events: SimEvent[] = [];
  const target = Math.min(u.days, s.day + days);
  while (s.day < target) {
    const d = ++s.day;
    // Pending orders
    a.orders = a.orders.filter((o) => {
      const p = priceAt(u, o.sym, d);
      const hit = o.type === "limit" ? (o.side === "buy" ? ask(p) <= o.limit : bid(p) >= o.limit) : (o.side === "sell" ? p <= o.limit : p >= o.limit);
      if (hit) {
        const fillMid = o.type === "limit" ? (o.side === "buy" ? Math.min(p, o.limit / (1 + SPREAD)) : Math.max(p, o.limit / (1 - SPREAD))) : p;
        if (!execute(a, o.sym, o.side, o.qty, fillMid, d, o.type, o.exchange)) events.push({ kind: "fill", day: d, trade: a.trades.at(-1)!, order: o });
        return false;
      }
      const expired = o.validity === "day" ? d > o.placed : o.validity === "ultimo" ? d - o.placed > PLAN_EVERY : false;
      if (expired) events.push({ kind: "expired", day: d, order: o });
      return !expired;
    });
    // Savings plans: no fixed fee, fractional shares allowed (as with real savings plans).
    for (const pl of a.plans) {
      if ((d - pl.from) % PLAN_EVERY !== 1) continue; // first run the day after setup, then monthly
      const price = ask(priceAt(u, pl.sym, d));
      const net = round2(pl.amount * (1 - PLAN_FEE_RATE));
      const qty = Math.round((net / price) * 1e4) / 1e4;
      a.deposits[d] = round2((a.deposits[d] ?? a.deposits[d - 1] ?? 0) + pl.amount);
      const h = a.holdings[pl.sym] ?? { qty: 0, cost: 0 };
      a.holdings[pl.sym] = { qty: round2(h.qty * 1e4 + qty * 1e4) / 1e4, cost: round2(h.cost + pl.amount) };
      a.trades.push({ day: d, sym: pl.sym, side: "buy", qty, price, fee: round2(pl.amount - net), type: "market", exchange: "Sparplan" });
      events.push({ kind: "plan", day: d, sym: pl.sym, qty, amount: pl.amount });
    }
    a.deposits[d] = a.deposits[d] ?? a.deposits[d - 1] ?? 0;
    a.values[d] = round2(a.cash + Object.entries(a.holdings).reduce((v, [sym, h]) => v + h.qty * priceAt(u, sym, d), 0));
    const big = u.news.filter((n) => n.day === d && n.major);
    for (const n of big) events.push({ kind: "news", day: d, news: n });
    if (opts.stopAtMajor && big.length) break;
  }
  return { sim: s, events };
}

/** Days until the next major headline (or the end). */
export function daysToNextEvent(s: Sim): number {
  const u = universeOf(s.universe);
  const next = u.news.find((n) => n.major && n.day > s.day);
  return (next ? next.day : u.days) - s.day;
}

// ── Scores ────────────────────────────────────────────────────────────────

/** Value curve with deposits removed, as a growth index starting at 1. */
export function growth(values: number[], deposits: number[]): number[] {
  const out = [1];
  for (let i = 1; i < values.length; i++) {
    const added = (deposits[i] ?? deposits[i - 1] ?? 0) - (deposits[i - 1] ?? 0);
    const prev = values[i - 1];
    out.push(prev > 0 ? out[i - 1] * ((values[i] - added) / prev) : out[i - 1]);
  }
  return out;
}

export function maxDrawdown(series: number[]): number {
  let peak = series[0], dd = 0;
  for (const v of series) { peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak); }
  return dd;
}

/** Risk-adjusted score in %: return − ½ × worst drawdown. All-in gambling rarely tops this. */
export function riskScore(series: number[]) {
  const ret = series[series.length - 1] / series[0] - 1;
  return round2((ret - 0.5 * maxDrawdown(series)) * 100);
}
export const returnPct = (series: number[]) => round2((series[series.length - 1] / series[0] - 1) * 100);
