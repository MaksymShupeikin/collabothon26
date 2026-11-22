export type TestBar = { date: string; open: number; close: number };

const STARTING_CASH = 10_000;
const FEE = 0.001;
const SLIPPAGE = 0.0005;

export function runBacktest(bars: TestBar[], firstTradeBar = 0) {
  if (bars.length < 21) return null;
  let cash = STARTING_CASH, shares = 0, closed = 0;
  let peak = cash, equity = cash, drawdown = 0;
  let fastSum = 0, slowSum = 0, previousGap: number | undefined;
  let pending: "buy" | "sell" | undefined;
  for (const [i, bar] of bars.entries()) {
    // A crossover on yesterday's close can only fill at today's open.
    if (pending === "buy") {
      const unitCost = bar.open * (1 + SLIPPAGE) * (1 + FEE);
      shares = Math.floor(cash / unitCost);
      cash -= shares * unitCost;
    } else if (pending === "sell") {
      cash += shares * bar.open * (1 - SLIPPAGE) * (1 - FEE);
      shares = 0;
      closed++;
    }
    equity = cash + shares * bar.close;
    peak = Math.max(peak, equity);
    drawdown = Math.max(drawdown, (peak - equity) / peak);
    pending = undefined;

    fastSum += bar.close - (bars[i - 5]?.close ?? 0);
    slowSum += bar.close - (bars[i - 20]?.close ?? 0);
    if (i < 19) continue;
    const gap = fastSum / 5 - slowSum / 20;
    if (i >= firstTradeBar && previousGap !== undefined) {
      if (!shares && previousGap <= 0 && gap > 0) pending = "buy";
      if (shares && previousGap >= 0 && gap < 0) pending = "sell";
    }
    previousGap = gap;
  }
  return { returnPct: (equity / STARTING_CASH - 1) * 100, drawdown: drawdown * 100, closed };
}
