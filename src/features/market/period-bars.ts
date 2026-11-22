import type { ReplayBar } from "./replay-market.ts";

export type Period = "1W" | "1M";

function periodStart(session: string, interval: Period) {
  if (interval === "1M") return session.slice(0, 7);
  const monday = new Date(session + "T00:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}

export function periodBars(sessions: string[], daily: ReplayBar[], asOf: string, interval: Period) {
  const bars: (ReplayBar & { date: string })[] = [];
  let previous = "";
  for (const [i, date] of sessions.entries()) {
    if (date > asOf) break;
    const day = daily[i];
    if (day.closed) continue;
    const period = periodStart(date, interval);
    if (period !== previous) {
      bars.push({ ...day, date });
      previous = period;
      continue;
    }
    const bar = bars[bars.length - 1];
    bar.high = Math.max(bar.high, day.high);
    bar.low = Math.min(bar.low, day.low);
    bar.close = day.close;
    bar.volume = bar.volume === undefined || day.volume === undefined ? undefined : bar.volume + day.volume;
  }
  return bars;
}
