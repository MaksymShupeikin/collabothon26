import type { Company } from "./data/companies.ts";
import type { Effect, News } from "./market.ts";
import { rng } from "./rng.ts";

// Mock news engine: events are inspired by real past patterns (earnings beats, misses,
// takeover rumors, rate hikes, sector scandals) but recombined with random companies and timing.
export function generateNews(companies: Company[], days: number, seed: number): News[] {
  const r = rng(seed ^ 0x9e3779b9);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const pct = (a: number, b: number) => Math.round(between(a, b));
  const stocks = companies.filter((c) => c.sector !== "ETF");
  const news: News[] = [];
  const add = (n: Omit<News, "id">) => news.push({ ...n, id: news.length + 1 });
  const fx = (target: string, from: number, days: number, total: number): Effect => ({ target, from, days, total });

  // Background noise: 1–3 unimportant headlines every day.
  for (let d = 1; d <= days; d++) {
    const count = 1 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) add(noise(d));
  }

  // Real events every 5–10 days; marked "major" in the feed.
  for (let d = 4; d < days - 2; d += 5 + Math.floor(r() * 6)) {
    const c = pick(stocks);
    const roll = r();
    if (roll < 0.15) {
      const up = r() < 0.6;
      add({
        day: d, kind: "signal", sym: c.sym, major: true, tone: up ? 1 : -1, concept: "earnings",
        headline: up
          ? `${c.name} beats forecasts: quarterly revenue +${pct(18, 32)}%, outlook raised`
          : `${c.name} cuts full-year outlook, cites weak demand`,
        effects: [fx(c.sym, d, 2, up ? between(0.06, 0.12) : -between(0.07, 0.13))],
        explain: up
          ? "Real new information: results AND outlook beat expectations, so the price moved up."
          : "Lower guidance is real news about future profits. The price adjusted down.",
      });
    } else if (roll < 0.27) {
      add({
        day: d, kind: "priced_in", sym: c.sym, major: true, tone: 1, concept: "priced-in",
        headline: `${c.name} confirms dividend increase, as analysts expected`,
        effects: [fx(c.sym, d, 1, 0.003)],
        explain: "Everyone expected it. The price already contained this news — it was priced in.",
      });
    } else if (roll < 0.42) {
      const x = pct(6, 14);
      add({
        day: d, kind: "miss", sym: c.sym, major: true, tone: 1, concept: "earnings",
        headline: `${c.name} profit up ${x}% — analysts had expected ${x + pct(4, 8)}%`,
        effects: [fx(c.sym, d, 2, -between(0.05, 0.09))],
        explain: "Good news that wasn't good enough. Markets trade on expectations, not on headlines.",
      });
    } else if (roll < 0.6) {
      add({
        day: d, kind: "rumor", sym: c.sym, major: true, tone: 1, concept: "rumor",
        headline: `Report: ${c.name} in takeover talks, sources say`,
        effects: [fx(c.sym, d, 2, between(0.06, 0.1))],
        explain: "An unconfirmed rumor. The price jumped on hope — buy the rumor, sell the news.",
      });
      const later = d + 4 + Math.floor(r() * 4);
      if (r() < 0.6) {
        add({
          day: later, kind: "signal", sym: c.sym, major: true, tone: -1, concept: "rumor",
          headline: `${c.name} denies takeover talks`,
          effects: [fx(c.sym, later, 3, -between(0.09, 0.13))],
          explain: "The rumor was false. Everyone who bought the hype lost money.",
        });
      } else {
        add({
          day: later, kind: "signal", sym: c.sym, major: true, tone: 1, concept: "rumor",
          headline: `${c.name} confirms takeover offer at a premium`,
          effects: [fx(c.sym, later, 1, 0.04)],
          explain: "This time the rumor was true. Rumors sometimes pay off — that's why they are dangerous.",
        });
      }
    } else if (roll < 0.72) {
      const tech = r() < 0.5;
      add({
        day: d, kind: "sector", major: true, tone: -1, concept: "correlation",
        headline: tech
          ? "New chip export limits announced — tech stocks under pressure"
          : "Emissions probe at a major carmaker rattles the auto sector",
        effects: [fx(tech ? "sector:Tech" : "sector:Auto", d, 3, -between(0.05, 0.08))],
        explain: "Bad news for one company often drags its whole sector down — that's correlation.",
      });
    } else if (roll < 0.86) {
      const hawk = r() < 0.5;
      add({
        day: d, kind: "macro", major: true, tone: hawk ? -1 : 1, concept: "interest-rates",
        headline: hawk
          ? "Central bank raises interest rates by 0.5 points"
          : "Inflation cools faster than expected — rate cuts in sight",
        effects: [fx("*", d, 3, hawk ? -0.03 : 0.035), fx("sector:Tech", d, 3, hawk ? -0.03 : 0.02)],
        explain: hawk
          ? "Higher rates make borrowing pricier and bonds more attractive. Stocks fall, growth/tech the most."
          : "Lower rates ahead make stocks more attractive, especially growth/tech.",
      });
    } else if (roll < 0.93) {
      add({
        day: d, kind: "delayed", major: true, tone: 0, concept: "priced-in",
        headline: "EU agrees new rules for car makers, effective in two weeks",
        effects: [fx("sector:Auto", d + 10, 4, -between(0.04, 0.07))],
        explain: "Not everything is priced in at once. This rule hit prices when it took effect, ~10 days later.",
      });
    } else {
      add({
        day: d, kind: "noise", sym: c.sym, major: true, tone: 1, concept: "rumor",
        headline: `Star investor on TV: "${c.name} could double this year"`,
        effects: [],
        explain: "An opinion, not information. Nothing about the company changed.",
      });
    }
  }

  function noise(d: number): Omit<News, "id"> {
    const c = pick(stocks);
    const t = pick([
      { h: `${c.name} CEO: "We're excited about the year ahead"`, tone: 1 as const },
      { h: `Analyst keeps ${c.name} at "hold"`, tone: 0 as const },
      { h: `${c.name} opens new office in Lisbon`, tone: 1 as const },
      { h: `${c.name} launches new ad campaign`, tone: 0 as const },
      { h: `Blogger: "${c.name} chart looks weak"`, tone: -1 as const },
      { h: `${c.name} board member sells small stake (planned sale)`, tone: -1 as const },
      { h: `${c.name} wins design award for new product`, tone: 1 as const },
      { h: "Weather: rainy weekend expected in Frankfurt", tone: 0 as const, none: true },
      { h: "Bundesliga: late winner sends fans into celebration", tone: 0 as const, none: true },
    ]);
    return {
      day: d, kind: "noise", sym: "none" in t ? undefined : c.sym, major: false, tone: t.tone, concept: "rumor",
      headline: t.h, effects: [], explain: "Noise. Nothing changed about the business.",
    };
  }

  return news.sort((a, b) => a.day - b.day || a.id - b.id);
}
