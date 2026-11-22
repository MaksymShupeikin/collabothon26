import { companyOf, type Company } from "./companies.ts";
import { registerUniverse, round2, type Universe } from "./engine.ts";
import type { ReplayBar } from "./replay-market.ts";

type DailyBar = [string, number, number, number, number, number];
/** Sessions kept before the simulation start so the chart still has candles on its left. */
export const MIN_HISTORY = 20;
export type MarketFile = {
  stocks: Record<string, { name: string; currency: "EUR" | "USD"; bars: DailyBar[] }>;
  eurUsd: Record<string, number>;
};

/** `startIndex` (optional): session where the simulation starts (day 0). Used to rewind the market simulation. */
export function registerRealMarket(file: MarketFile, now = new Date(), startIndex?: number): Universe {
  const stocks = Object.entries(file.stocks);
  const commonStart = stocks.map(([, stock]) => stock.bars[0][0]).sort().at(-1)!;
  const sessions = [...new Set(stocks.flatMap(([, stock]) => stock.bars.map(([date]) => date)))]
    .filter((date) => date >= commonStart).sort();
  // Start inside Yahoo's rolling 60-day intraday window. Leave room on the
  // left for initial candles and choose a session shared by both markets.
  const recentStart = new Date(now.getTime() - 45 * 86_400_000).toISOString().slice(0, 10);
  const recentIndex = sessions.findIndex((date) => date >= recentStart &&
    stocks.every(([, stock]) => stock.bars.some(([session]) => session === date)));
  const history = startIndex === undefined ? Math.max(60, recentIndex) : Math.max(MIN_HISTORY, Math.min(sessions.length - 2, startIndex));
  const fx = Object.entries(file.eurUsd).sort(([a], [b]) => a.localeCompare(b));
  const rateByDay = new Map<string, number>();
  let fxIndex = -1;
  for (const date of sessions) {
    while (fxIndex + 1 < fx.length && fx[fxIndex + 1][0] <= date) fxIndex++;
    const rate = fx[fxIndex]?.[1];
    if (!(rate > 0)) throw new Error(`Missing EUR/USD rate for ${date}`);
    rateByDay.set(date, rate);
  }
  const observedBars: Record<string, ReplayBar[]> = {};
  const companies = stocks.map(([sym, stock]): Company => {
    const observations = new Map(stock.bars.map((bar) => [bar[0], bar]));
    let previous: ReplayBar | undefined;
    observedBars[sym] = sessions.map((date) => {
      const row = observations.get(date);
      if (!row) {
        if (!previous) throw new Error(`Missing starting quote for ${sym}`);
        return { ...previous, closed: true, volume: 0 };
      }
      const [, open, high, low, close, volume] = row;
      const rate = stock.currency === "USD" ? rateByDay.get(date)! : 1;
      previous = {
        open: round2(open / rate), high: round2(high / rate), low: round2(low / rate),
        close: round2(close / rate), volume, activity: 1,
      };
      return previous;
    });
    const existing = companyOf(sym.replace(/\.DE$/, ""));
    return {
      sym, name: stock.name, short: stock.name,
      wkn: existing?.wkn ?? "", isin: existing?.isin ?? "", type: "Aktie",
      sector: existing?.sector ?? "", price: observedBars[sym][history].close,
      vol: 0, drift: 0, venue: stock.currency === "EUR" ? "Xetra" : "US",
    };
  });
  const u: Universe = {
    id: "real-market", seed: 0, syms: companies.map((company) => company.sym), companies,
    observedBars, history, days: sessions.length - history - 1,
    news: [], startDate: sessions[history], historical: { sessions },
  };
  registerUniverse(u);
  return u;
}
