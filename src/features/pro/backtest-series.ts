import type { UTCTimestamp } from "lightweight-charts";
import type { ReplayBar } from "@/features/market/replay-market";
import type { Interval, IntradayBar } from "@/features/pro/MarketChart";
import { periodBars } from "@/features/market/period-bars";

/**
 * A backtest replays one series of bars for the chosen timeframe. Every timeframe is normalised to the same
 * shape so the replay logic (cursor, step, play, scrub, pick) does not care where the bars came from:
 * 1D = the desk's daily closes, 1W = daily bars rolled up by week, 5m..4h = intraday bars from the quotes API.
 */
export type BtSeries = {
  prices: number[];
  bars?: ReplayBar[];
  times: (string | UTCTimestamp)[]; // ISO day for 1D/1W, epoch seconds for intraday
  ms: number[]; // bar start in ms, used to keep the same moment when the timeframe changes
  span: number; // nominal bar length in ms (0 for intraday: the stamp itself is the anchor)
  intraday: boolean;
};

export const isIntraday = (tf: Interval) => tf !== "1D" && tf !== "1W";

/** How far back a fresh backtest starts, in bars of that timeframe (roughly: 1 day, 2 days, 1–2 weeks, 3 months, 6 months). */
export const BT_BACK_BY_TF: Record<Interval, number> = { "5m": 100, "15m": 70, "1h": 45, "4h": 30, "1D": 63, "1W": 26 };

/** Unit for the "N … before today" line. */
export const btUnit = (tf: Interval, n: number) =>
  tf === "1D" ? (n === 1 ? "session" : "sessions") : tf === "1W" ? (n === 1 ? "week" : "weeks") : (n === 1 ? `${tf} bar` : `${tf} bars`);

const DAY = 86_400_000;
const dayMs = (iso: string) => Date.parse(iso + "T00:00:00Z");

export function dailySeries(prices: number[], bars: ReplayBar[] | undefined, times: string[]): BtSeries {
  return { prices, bars, times, ms: times.map(dayMs), span: DAY, intraday: false };
}

export function periodSeries(bars: (ReplayBar & { date: string })[]): BtSeries {
  return { prices: bars.map((b) => b.close), bars, times: bars.map((b) => b.date), ms: bars.map((b) => dayMs(b.date)), span: 7 * DAY, intraday: false };
}

/** Intraday bars up to and including `asOf` (the desk's current day). */
export function intradaySeries(raw: IntradayBar[], asOf: string): BtSeries {
  const kept = raw.filter(([, date]) => date <= asOf);
  return {
    prices: kept.map((b) => b[5]),
    bars: kept.map(([, , open, high, low, close, volume]) => ({ open, high, low, close, volume, activity: 1 })),
    times: kept.map(([stamp]) => stamp as UTCTimestamp),
    ms: kept.map(([stamp]) => stamp * 1000),
    span: 0,
    intraday: true,
  };
}

/** Index of the last bar that starts at or before `target` ms (0 if none). */
export function indexAtOrBefore(series: BtSeries, target: number): number {
  let lo = 0, hi = series.ms.length - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series.ms[mid] <= target) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

/**
 * End of a bar in ms, used as the replay anchor. Intraday: the bar's own stamp. Daily and weekly: just before the
 * next bar starts (so a week covers all its sessions), or start + nominal length for the newest bar.
 */
export const barEndMs = (series: BtSeries, i: number) => {
  const start = series.ms[i] ?? 0;
  if (series.intraday) return start;
  const next = series.ms[i + 1];
  return next !== undefined ? next - 1 : start + series.span - 1;
};

// Weekly bars are rolled up from the daily bars once per (stock, day) and reused, so the series keeps its identity
// across renders (the chart then keeps its viewport instead of resetting on every render).
const weeklyCache = new WeakMap<ReplayBar[], Map<string, BtSeries>>();
export function weeklySeries(sessions: string[], daily: ReplayBar[], asOf: string): BtSeries {
  let byDay = weeklyCache.get(daily);
  if (!byDay) weeklyCache.set(daily, (byDay = new Map()));
  let hit = byDay.get(asOf);
  if (!hit) byDay.set(asOf, (hit = periodSeries(periodBars(sessions, daily, asOf, "1W"))));
  return hit;
}
