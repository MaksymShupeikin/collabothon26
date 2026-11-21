import { execute, FEE_FIXED, FEE_RATE, newAccount, priceAt, round2, SPREAD, universeOf, type Account } from "./engine.ts";
import type { BotId, Replay } from "./scenarios.ts";

export const BOTS: Record<BotId, { name: string; habit: string; concept: string }> = {
  max: { name: "FOMO Max", habit: "Buys every rumor and hype", concept: "rumor" },
  paula: { name: "Panic Paula", habit: "Sells on every drop", concept: "drawdown" },
  alex: { name: "All-in Alex", habit: "Puts everything in one stock", concept: "diversification" },
  sam: { name: "Steady Sam", habit: "Monthly ETF savings plan, never sells", concept: "savings-plan" },
};

export type BotRun = { id: BotId; acct: Account };

/**
 * Scripted mock bots (phase 1): the moves are hand-written per replay, the depot curves follow from them.
 * Deterministic, so the "precomputed" leaderboard is the same on every run.
 */
export function runBots(r: Replay): BotRun[] {
  const u = universeOf(r.universe.id);
  return r.bots.map((id) => {
    const a = newAccount(r.budget);
    for (let d = 0; d <= u.days; d++) {
      for (const m of r.moves.filter((x) => x.bot === id && x.day === d)) {
        if (m.sells) for (const sym of m.sells) { const h = a.holdings[sym]; if (h) execute(a, sym, "sell", h.qty, priceAt(u, sym, d), d); }
        if (m.buys) {
          const budget = a.cash;
          for (const [sym, share] of m.buys) {
            const p = priceAt(u, sym, d);
            const qty = Math.floor((budget * share - FEE_FIXED - 0.5) / (p * (1 + SPREAD) * (1 + FEE_RATE)));
            if (qty > 0) execute(a, sym, "buy", qty, p, d);
          }
        }
      }
      a.values[d] = round2(a.cash + Object.entries(a.holdings).reduce((v, [sym, h]) => v + h.qty * priceAt(u, sym, d), 0));
      a.deposits[d] = r.budget;
    }
    return { id, acct: a };
  });
}
