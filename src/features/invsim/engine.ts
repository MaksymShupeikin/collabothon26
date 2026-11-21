import { gauss, rng } from "../../shared/lib/rng.ts";

/**
 * Investor Simulator: 30 years of a life, one turn per year.
 * Pure and deterministic per seed, so a run can be replayed and checked (engine.check.ts).
 * Numbers are illustrative, not a forecast: returns are drawn around a long-run stock-market average.
 */

export const START_AGE = 30;
export const YEARS = 30;
export const START_INCOME = 4000; // € a year left over after rent and living costs
const INCOME_GROWTH = 0.03;
const CUSHION_RATE = 0.015, HIGH_RATE = 0.03, LOAN_RATE = 0.09;
const ETF_FEE = 0.002, FUND_FEE = 0.018;
export const CRASH = { etf: 0.34, stock: 0.5 };
export const DIP = { etf: 0.18, stock: 0.3 };
export const COLLAPSE = 0.85;

export type Jar = "cushion" | "etf" | "stock" | "spend";
export const JARS: Jar[] = ["cushion", "etf", "stock", "spend"];
/** The year's money in tenths per jar; always sums to 10. */
export type Split = Record<Jar, number>;
export type Wallet = { cushion: number; etf: number; stock: number; debt: number };
export type Market = { etf: number[]; stock: number[]; crash: number; dip: number };
export type Tone = "good" | "bad" | "neutral";
export type Flags = {
  fund: boolean; // swapped the ETF for a 1,8 % fund
  soldCrash: boolean; // sold in the crash
  forced: number; // times a bill forced a sale of investments
  borrowed: number; // times a bill needed a loan
  highRateUntil: number; // savings pay 3 % until this year
  incomeFactor: number; // this year only (job loss, sabbatical)
};
export type Log = { year: number; age: number; event: string; title: string; choice?: string; note: string; tone: Tone; concept?: string };
export type RivalId = "anna" | "max" | "sleeper";
/** Where a year's money came from and went: shown as "Last year" in the wallet. */
export type Flows = { salary: number; spent: number; market: number; interest: number; bills: number; gifts: number };
export const NO_FLOWS: Flows = { salary: 0, spent: 0, market: 0, interest: 0, bills: 0, gifts: 0 };
export type Game = {
  seed: number;
  year: number; // 0..YEARS; YEARS = retired
  market: Market;
  schedule: string[]; // event id per year
  extra: number; // € a year on top of the base income (raises, kids, rent)
  wallet: Wallet;
  joy: number; // 0..100
  split: Split;
  flags: Flags;
  picked: string | null; // choice made this year
  note: string | null; // what the event or choice did
  alert: string | null; // a bill the cushion couldn't cover
  worth: number[]; // net worth at the start of each year, then at 60
  joyHist: number[];
  returns: number[]; // ETF return per finished year, for the recap
  log: Log[];
  rivals: Record<RivalId, number[]>;
  enjoyed: number; // € put into the Enjoy jar over the years
  flows: Flows; // this year so far (events)
  last: Flows | null; // the finished year
};

export const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const baseIncome = (y: number) => Math.round(START_INCOME * (1 + INCOME_GROWTH) ** y);
export const income = (g: Game) => Math.max(0, Math.round((baseIncome(g.year) + g.extra) * g.flags.incomeFactor));
export const netWorth = (w: Wallet) => r2(w.cushion + w.etf + w.stock - w.debt);

// ── Market ────────────────────────────────────────────────────────────────

/**
 * Ordinary years scatter around a long-run average; one crash, one dip. Their drops are applied by the crash/dip events,
 * so those years are flat. Ordinary years are re-centred on the average, so every run tells the same long-run story in a different order.
 */
const AVG = 0.075;
export function makeMarket(seed: number): Market {
  const r = rng(seed);
  const crash = 6 + Math.floor(r() * 6); // age 36–41
  const dip = 18 + Math.floor(r() * 6); // age 48–53
  const special = (y: number) => y === crash || y === dip || y === crash + 1;
  const rawE = Array.from({ length: YEARS }, () => gauss(r) * 0.12);
  const rawS = rawE.map((e) => e + gauss(r) * 0.2); // single stocks: the market plus a lot of company luck
  const centre = (raw: number[], avg: number) => {
    const ord = raw.filter((_, y) => !special(y));
    const shift = avg - ord.reduce((a, b) => a + b, 0) / ord.length;
    return raw.map((v) => Math.round(clamp(v + shift, -0.45, 0.6) * 10000) / 10000);
  };
  const etf = centre(rawE, AVG), stock = centre(rawS, AVG);
  for (const [y, v] of [[crash, 0.01], [dip, 0.01], [crash + 1, 0.27]] as const) { etf[y] = v; stock[y] = v * 1.3; }
  return { etf, stock, crash, dip };
}

// ── Rivals: same salary, same market, one fixed habit each ────────────────

export function simulateRivals(m: Market, collapseYear: number, start: number): Record<RivalId, number[]> {
  let anna = start, sleeper = start, maxCash = start, maxStock = 0;
  const out: Record<RivalId, number[]> = { anna: [start], max: [start], sleeper: [start] };
  for (let y = 0; y < YEARS; y++) {
    const inc = baseIncome(y);
    // Max sells everything in the crash and the dip, and only buys back a year later, after the rebound.
    if (y === m.crash || y === m.dip) { maxStock *= 1 - (y === m.crash ? CRASH.stock : DIP.stock); maxCash += maxStock; maxStock = 0; }
    if (y === collapseYear) maxStock *= 1 - COLLAPSE;
    const sitsOut = y === m.crash || y === m.crash + 1 || y === m.dip || y === m.dip + 1;
    if (!sitsOut && maxCash > 0) { maxStock += maxCash; maxCash = 0; }
    if (sitsOut) maxCash += inc; else maxStock = maxStock * (1 + m.stock[y]) + inc * (1 + m.stock[y] / 2);
    anna = anna * (1 + CUSHION_RATE) + inc;
    sleeper += inc;
    out.anna.push(r2(anna)); out.max.push(r2(maxStock + maxCash)); out.sleeper.push(r2(sleeper));
  }
  return out;
}

// ── Schedule: which event lands in which year ─────────────────────────────

/** [event id, earliest year, latest year]. Fixed years (first pay, crash, rebound, dip) are set first. */
const WINDOWS: [string, number, number][] = [
  ["hype", 2, 99], ["wedding", 2, 10], ["promo", 3, 12], ["car", 3, 14], ["fee", 4, 16], ["job", 5, 20],
  ["record", 3, 17], ["bonus", 2, 26], ["kids", 5, 14], ["rate", 10, 25], ["inflation", 8, 22], ["sabbatical", 8, 24],
  ["rent", 6, 20], ["side", 10, 26], ["promo2", 14, 24], ["inherit", 15, 27], ["appliances", 12, 28], ["pension", 22, 28],
];

export function makeSchedule(seed: number, m: Market): string[] {
  const r = rng(seed * 7 + 3);
  const s: string[] = Array(YEARS).fill("");
  s[0] = "first-pay"; s[m.crash] = "crash"; s[m.crash + 1] = "rebound"; s[m.dip] = "dip";
  const free = (lo: number, hi: number) => s.map((v, i) => (v === "" && i >= lo && i <= hi ? i : -1)).filter((i) => i >= 0);
  const place = (id: string, lo: number, hi: number) => {
    // Window full: the next free year after it keeps the order (wedding before kids), else any free year.
    const opts = [free(lo, hi), free(lo, YEARS - 1), free(1, YEARS - 1)].find((o) => o.length)!;
    const y = opts[Math.floor(r() * opts.length)];
    s[y] = id;
    return y;
  };
  for (const [id, lo, hi] of WINDOWS) {
    if (id === "hype") { const h = place("hype", 2, m.crash - 1); place("collapse", h + 2, h + 5); continue; }
    if (id === "kids") { const w = s.indexOf("wedding"); place("kids", w + 1, w + 4); continue; }
    place(id, lo, hi);
  }
  return s.map((v) => v || "quiet");
}

// ── Money moves ───────────────────────────────────────────────────────────

/** A bill: from the cushion first; what's missing forces a sale of investments, then a loan. `count: false` for money that only moves (a bet from the cushion). */
export function pay(g: Game, amount: number, count = true): Game {
  const w = { ...g.wallet };
  let due = amount, alert: string | null = null;
  const fromCushion = Math.min(w.cushion, due);
  w.cushion = r2(w.cushion - fromCushion); due = r2(due - fromCushion);
  const flags = { ...g.flags };
  if (due > 0) {
    const sold = Math.min(w.etf + w.stock, due);
    const fromEtf = Math.min(w.etf, sold);
    w.etf = r2(w.etf - fromEtf); w.stock = r2(w.stock - (sold - fromEtf)); due = r2(due - sold);
    if (sold > 0) { flags.forced++; alert = `Your cushion was short, so you had to sell ${Math.round(sold).toLocaleString("de-DE")} € of investments, whatever the price.`; }
  }
  if (due > 0) {
    w.debt = r2(w.debt + due); flags.borrowed++;
    alert = `Nothing left to sell: you borrowed ${Math.round(due).toLocaleString("de-DE")} € at 9 % interest.`;
  }
  return { ...g, wallet: w, flags, alert: alert ?? g.alert, flows: count ? { ...g.flows, bills: r2(g.flows.bills + amount) } : g.flows };
}

export const gain = (g: Game, jar: "cushion" | "etf" | "stock", amount: number, count = true): Game =>
  ({ ...g, wallet: { ...g.wallet, [jar]: r2(g.wallet[jar] + amount) }, flows: count ? { ...g.flows, gifts: r2(g.flows.gifts + amount) } : g.flows });
/** A market shock (crash, dip, collapse): prices fall now, the loss counts as market. */
export function shock(g: Game, etf: number, stock: number): Game {
  const w = { ...g.wallet, etf: r2(g.wallet.etf * (1 - etf)), stock: r2(g.wallet.stock * (1 - stock)) };
  const loss = g.wallet.etf - w.etf + g.wallet.stock - w.stock;
  return { ...g, wallet: w, flows: { ...g.flows, market: r2(g.flows.market - loss) } };
}
export const move = (g: Game, from: "cushion" | "etf" | "stock", to: "cushion" | "etf" | "stock", share: number): Game => {
  const amt = r2(g.wallet[from] * share);
  return { ...g, wallet: { ...g.wallet, [from]: r2(g.wallet[from] - amt), [to]: r2(g.wallet[to] + amt) } };
};
/** Joy of life per year: it fades by itself (−4), the Enjoy share lifts it (+2,5 per 10 %), nothing at all for fun costs 2 more. */
export const joyDrift = (split: Split) => -4 + split.spend * 2.5 - (split.spend === 0 ? 2 : 0);
export const addJoy = (g: Game, d: number): Game => ({ ...g, joy: clamp(Math.round(g.joy + d), 0, 100) });

/** Change one jar by ±1 tenth, taking from or giving to the others (spend first, then cushion, stock, ETF). */
export function nudge(split: Split, jar: Jar, d: 1 | -1): Split {
  if ((d > 0 && split[jar] >= 10) || (d < 0 && split[jar] <= 0)) return split;
  const s = { ...split, [jar]: split[jar] + d };
  const order: Jar[] = ["spend", "cushion", "stock", "etf"].filter((j) => j !== jar) as Jar[];
  const other = d > 0 ? order.find((j) => s[j] > 0) : order[0];
  if (!other) return split;
  s[other] -= d;
  return s;
}

// ── Turn loop ─────────────────────────────────────────────────────────────

export const DEFAULT_SPLIT: Split = { cushion: 3, etf: 4, stock: 1, spend: 2 };

export function newGame(seed: number, begin: (g: Game) => Game): Game {
  const market = makeMarket(seed);
  const schedule = makeSchedule(seed, market);
  const g: Game = {
    seed, year: 0, market, schedule, extra: 0,
    wallet: { cushion: 2000, etf: 0, stock: 0, debt: 0 }, joy: 60, split: { ...DEFAULT_SPLIT },
    flags: { fund: false, soldCrash: false, forced: 0, borrowed: 0, highRateUntil: -1, incomeFactor: 1 },
    picked: null, note: null, alert: null, worth: [2000], joyHist: [60], returns: [], log: [],
    rivals: simulateRivals(market, schedule.indexOf("collapse"), 2000),
    flows: { ...NO_FLOWS }, last: null, enjoyed: 0,
  };
  return begin(g);
}

/** Close the year: pay in the split, grow the money, start the next year's event. */
export function nextYear(g: Game, begin: (g: Game) => Game): Game {
  const y = g.year;
  const inc = income(g);
  const part = (j: Jar) => (inc * g.split[j]) / 10;
  const w = { ...g.wallet };
  const before = { ...w };
  const rate = y <= g.flags.highRateUntil ? HIGH_RATE : CUSHION_RATE;
  const e = g.market.etf[y] - (g.flags.fund ? FUND_FEE : ETF_FEE), s = g.market.stock[y];
  // Money paid in during the year earns about half the year's move.
  w.cushion = r2(w.cushion * (1 + rate) + part("cushion"));
  w.etf = r2(w.etf * (1 + e) + part("etf") * (1 + e / 2));
  w.stock = r2(w.stock * (1 + s) + part("stock") * (1 + s / 2));
  w.debt = r2(w.debt * (1 + LOAN_RATE));
  const market = w.etf - before.etf - part("etf") + w.stock - before.stock - part("stock");
  const interest = w.cushion - before.cushion - part("cushion") - (w.debt - before.debt);
  const last: Flows = { ...g.flows, salary: inc, spent: r2(part("spend")), market: r2(g.flows.market + market), interest: r2(interest) };
  const repay = Math.min(w.debt, w.cushion);
  w.debt = r2(w.debt - repay); w.cushion = r2(w.cushion - repay);
  const joy = g.joy + (inc > 0 ? joyDrift(g.split) : -4);
  const out: Game = {
    ...g, year: y + 1, wallet: w, joy: clamp(Math.round(joy), 0, 100), flows: { ...NO_FLOWS }, last, enjoyed: r2(g.enjoyed + part("spend")),
    flags: { ...g.flags, incomeFactor: 1 }, picked: null, note: null, alert: null,
    worth: [...g.worth, netWorth(w)], joyHist: [...g.joyHist, clamp(Math.round(joy), 0, 100)], returns: [...g.returns, g.market.etf[y]],
  };
  return out.year >= YEARS ? out : begin(out);
}

// ── End of the game ───────────────────────────────────────────────────────

export type Result = { worth: number; place: number; stars: [boolean, boolean, boolean]; board: { id: RivalId | "you"; worth: number }[] };

export function result(g: Game): Result {
  const worth = g.worth[g.worth.length - 1];
  const board = [{ id: "you" as const, worth }, ...(["anna", "max", "sleeper"] as RivalId[]).map((id) => ({ id, worth: g.rivals[id][YEARS] }))].sort((a, b) => b.worth - a.worth);
  return {
    worth, board, place: board.findIndex((b) => b.id === "you") + 1,
    stars: [worth > g.rivals.anna[YEARS] && worth > g.rivals.sleeper[YEARS], worth > g.rivals.max[YEARS], g.flags.forced === 0 && g.flags.borrowed === 0],
  };
}

/** What 2 % inflation a year does to money over n years, in today's euros. */
export const realValue = (n: number, years = YEARS) => n / 1.02 ** years;
