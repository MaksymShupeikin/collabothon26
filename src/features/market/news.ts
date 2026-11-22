import { rng } from "../../shared/lib/rng.ts";

// The six hidden news types. The type is revealed only after the price reaction.
export type NewsKind = "signal" | "noise" | "priced_in" | "rumor" | "sector" | "macro";
export type Effect = { target: string; from: number; days: number; total: number }; // target: SYM | "sector:X" | "*"
export type News = {
  id: string;
  session?: string; // first historical trading session reflecting the headline
  day: number; // game day the headline appears
  time: string; // HH:MM:SS, German format
  kind: NewsKind;
  sym?: string;
  headline: string;
  body?: string;
  source: string;
  major: boolean; // major news auto-pauses the time machine
  effects: Effect[];
  explain: string; // one line on *why*, shown after the reveal
  concept: string; // concept card id
};

export const KIND_LABEL: Record<NewsKind, string> = {
  signal: "Signal", noise: "Noise", priced_in: "Priced in", rumor: "Rumor", sector: "Sector", macro: "Macro",
};

const clock = (r: () => number) => {
  const s = 8 * 3600 + Math.floor(r() * 9.5 * 3600);
  return [s / 3600, (s / 60) % 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
};

/**
 * Free-play news: simulated macro and sector news only.
 * Rule from idea.md §8: we never invent company-specific news about a real company.
 */
export function generateNews(days: number, seed: number, from = 1): News[] {
  const r = rng(seed ^ 0x9e3779b9);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const news: News[] = [];
  const add = (n: Omit<News, "id" | "time" | "source"> & { source?: string }) =>
    news.push({ source: "Simulated newswire", ...n, id: `n${news.length + 1}`, time: clock(r) });
  const fx = (target: string, from: number, d: number, total: number): Effect => ({ target, from, days: d, total });

  for (let d = from; d <= days; d++) {
    if (r() < 0.55) add(noise(d)); // background noise most days
  }

  for (let d = Math.max(6, from); d < days - 2; d += 8 + Math.floor(r() * 10)) {
    const roll = r();
    if (roll < 0.2) {
      const hawk = r() < 0.5;
      add({
        day: d, kind: "macro", major: true, concept: "signal-noise",
        headline: hawk ? "ECB unexpectedly raises key rate by 0.5 points" : "Inflation cools faster than expected, rate cuts in sight",
        body: hawk ? "Most economists had expected rates to stay on hold." : "Consumer prices rose less than forecast for the second month in a row.",
        effects: [fx("*", d, 3, hawk ? -0.03 : 0.03), fx("sector:Tech", d, 3, hawk ? -0.025 : 0.02)],
        explain: hawk
          ? "A surprise is real new information. Higher rates make stocks less attractive, growth stocks the most."
          : "A surprise is real new information. Lower rates ahead make stocks more attractive.",
      });
    } else if (roll < 0.4) {
      add({
        day: d, kind: "priced_in", major: true, concept: "priced-in",
        headline: "ECB keeps key rate unchanged, as widely expected",
        body: "The decision matches what nearly all economists had forecast.",
        effects: [fx("*", d, 1, 0.002)],
        explain: "Everyone expected it, so it was already in the price. Nothing new, no move.",
      });
    } else if (roll < 0.58) {
      const up = r() < 0.5;
      add({
        day: d, kind: "sector", major: true, concept: "signal-noise",
        headline: up ? "Oil price falls 8 % after OPEC+ agrees on higher output" : "New chip export limits announced, tech sector under pressure",
        effects: up ? [fx("sector:Auto", d, 3, 0.04), fx("*", d, 2, 0.01)] : [fx("sector:Tech", d, 3, -between(0.05, 0.08))],
        explain: up
          ? "Cheaper oil helps carmakers and consumers. A whole sector moved, not one company."
          : "One decision hit a whole sector at once. Owning only tech stocks means owning this risk.",
      });
    } else if (roll < 0.78) {
      add({
        day: d, kind: "rumor", major: true, concept: "rumor",
        headline: "Report: government considers new purchase bonus for electric cars, sources say",
        body: "No official confirmation. A ministry spokesperson declined to comment.",
        effects: [fx("sector:Auto", d, 2, between(0.04, 0.07))],
        explain: "An unconfirmed rumor. Prices rose on hope alone.",
      });
      const later = d + 4 + Math.floor(r() * 3);
      add({
        day: later, kind: "signal", major: true, concept: "rumor",
        headline: "Government: no new purchase bonus for electric cars planned",
        effects: [fx("sector:Auto", later, 2, -between(0.06, 0.09))],
        explain: "The rumor was wrong. Whoever bought the hype lost money.",
      });
    } else {
      add({
        day: d, kind: "noise", major: true, concept: "signal-noise",
        headline: 'Star investor on TV: "The market could double this year"',
        effects: [],
        explain: "An opinion, not information. Nothing about any company changed.",
      });
    }
  }

  function noise(d: number): Omit<News, "id" | "time" | "source"> {
    return {
      day: d, kind: "noise", major: false, concept: "signal-noise", effects: [],
      explain: "Noise. Nothing changed about any business.",
      headline: pick([
        "Weather: rainy weekend expected in Frankfurt",
        "Bundesliga: late winner sends fans into celebration",
        "Survey: Germans plan to spend more on holidays this year",
        "Trade fair in Hannover opens with record number of exhibitors",
        'Blogger: "The DAX chart looks weak this week"',
        "Analysts debate whether summer will be calm on the markets",
        "Euro little changed against the dollar",
        "Christmas markets expect more visitors than last year",
      ]),
    };
  }

  return news.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}
