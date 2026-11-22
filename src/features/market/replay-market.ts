import { quotes } from "./history-quotes.ts";
import { gauss, rng } from "../../shared/lib/rng.ts";
import type { Company } from "./companies.ts";
import type { Path, Universe } from "./engine.ts";

export type ReplayBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  closed?: boolean;
  activity: number; // relative, simulated activity (1 = a normal session)
};

export type HistoricalMarket = {
  volatility?: { from: number; through: number; multiplier: number }[];
  sessions?: string[]; // includes the chart prehistory
};

const cents = (price: number) => Math.max(0.01, Math.round(price * 100) / 100);

function randomFor(seed: number, name: string) {
  for (const char of name) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return rng(seed);
}

function shocks(seed: number, name: string, length: number) {
  const random = randomFor(seed, name);
  return Array.from({ length }, () => gauss(random));
}

/** Condition daily log-price innovations on the two known closes of each segment. */
function fillBetweenAnchors(closes: number[], path: Path, history: number, changes: number[], sigma: number[]) {
  for (let k = 1; k < path.length; k++) {
    const [left, from] = path[k - 1];
    const [right, to] = path[k];
    const start = history + left;
    const end = history + right;
    let shockSum = 0;
    let variance = 0;
    for (let i = start + 1; i <= end; i++) {
      shockSum += changes[i];
      variance += sigma[i] ** 2;
    }
    const logMove = Math.log(to / from);
    let partialShock = 0;
    let partialVariance = 0;
    for (let i = start + 1; i < end; i++) {
      partialShock += changes[i];
      partialVariance += sigma[i] ** 2;
      const bridge = partialShock - partialVariance / variance * shockSum;
      // Limit deviations from sparse historical observations without flattening small daily moves.
      const noise = 0.18 * Math.tanh(bridge / 0.18);
      closes[i] = from * Math.exp(logMove * (i - start) / (end - start) + noise);
    }
    closes[end] = to;
  }
}

function buildCloses(
  u: Universe, company: Company, sigma: number[], changes: number[],
) {
  const path = u.paths?.[company.sym];
  const closes = new Array<number>(changes.length);
  const first = path?.[0];
  if (path && (first?.[0] !== 0 || path.at(-1)?.[0] !== u.days || path.some(([day, price], i) =>
    !Number.isInteger(day) || !Number.isFinite(price) || price <= 0 || (i > 0 && day <= path[i - 1][0])
  ))) throw new Error(`Invalid historical anchors for ${u.id}/${company.sym}`);

  const h = u.history;
  closes[h] = first?.[1] ?? company.price;
  // Start from day zero and walk back using only that close and pre-replay innovations.
  for (let i = h - 1; i >= 0; i--) {
    closes[i] = closes[i + 1] * Math.exp(-company.drift - changes[i + 1]);
  }
  if (path) {
    fillBetweenAnchors(closes, path, h, changes, sigma);
  } else {
    for (let i = h + 1; i < closes.length; i++) {
      closes[i] = closes[i - 1] * Math.exp(company.drift + changes[i]);
    }
  }
  return closes;
}

/** Generate the entire tape once so a bar is independent of zoom, chart type and simulation speed. */
export function buildReplayMarket(u: Universe, config: HistoricalMarket, companies: Company[]): Record<string, ReplayBar[]> {
  const length = u.history + u.days + 1;
  const market = shocks(u.seed, "market", length);
  const sectors = new Map([...new Set(companies.map((c) => c.sector))]
    .map((sector) => [sector, shocks(u.seed, `sector:${sector}`, length)]));
  const regimes = Array.from({ length }, (_, i) => {
    const day = i - u.history;
    return config.volatility?.find(({ from, through }) => day >= from && day <= through)?.multiplier ?? 1;
  });
  const closes: Record<string, number[]> = {};
  for (const c of companies) {
    const sector = sectors.get(c.sector)!;
    const stock = shocks(u.seed, `stock:${c.sym}`, length);
    const sigma = regimes.map((r) => Math.max(0.007, c.vol) * r);
    const changes = sigma.map((s, i) => s * (0.55 * market[i] + 0.35 * sector[i] + Math.sqrt(0.575) * stock[i]));
    const recorded = new Map(quotes[c.sym]?.map((row) => [row[0], row]));
    const sessions = config.sessions ?? [];
    const complete = sessions.length === length && sessions.every((date) => recorded.has(date));
    closes[c.sym] = complete
      ? sessions.map((date) => recorded.get(date)![4])
      : buildCloses(u, c, sigma, changes);
  }

  // An ETF with explicit anchors uses its own historical path. Otherwise use its configured basket.
  if (u.etf && !u.paths?.[u.etf.sym]) {
    const { sym, of } = u.etf;
    const fund = closes[sym];
    const grossReturn = (i: number) => of.reduce((sum, member) => sum + closes[member][i] / closes[member][i - 1], 0) / of.length;
    for (let i = u.history + 1; i < length; i++) fund[i] = fund[i - 1] * grossReturn(i);
    for (let i = u.history - 1; i >= 0; i--) fund[i] = fund[i + 1] / grossReturn(i + 1);
  }

  return Object.fromEntries(companies.map((c) => {
    const random = randomFor(u.seed, `bars:${c.sym}`);
    const prices = closes[c.sym].map(cents);
    const recorded = new Map(quotes[c.sym]?.map((row) => [row[0], row]));
    const bars = prices.map((close, i) => {
      const previous = prices[i - 1] ?? close;
      const move = Math.log(close / previous);
      const sigma = Math.max(0.007, c.vol) * regimes[i];
      // Opening gaps are smaller than large close-to-close jumps. The body and wicks account for intraday trading.
      const gap = Math.max(-0.12, Math.min(0.12, move * 0.35 + sigma * gauss(random) * 0.22));
      const open = cents(previous * Math.exp(gap));
      const range = sigma * 0.32 + Math.min(0.12, Math.abs(move) * 0.16);
      const modeledHigh = cents(Math.max(open, close) * Math.exp(range * (0.3 + random())));
      const low = cents(Math.min(open, close) * Math.exp(-range * (0.3 + random())));
      const activity = cents((0.7 + random() * 0.6) * regimes[i] * (1 + Math.min(8, Math.abs(move) / sigma) * 0.6));
      const observed = recorded.get(config.sessions?.[i] ?? "");
      if (observed) {
        const [, open, high, low, close, volume] = observed;
        return { open, high, low, close, activity, ...(volume === null ? {} : { volume }) };
      }
      return { open, high: modeledHigh, low, close, activity };
    });
    return [c.sym, bars];
  }));
}
