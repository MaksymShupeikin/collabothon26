import { periodBars } from "./period-bars.ts";
import { quotes } from "./history-quotes.ts";
// Self-check for the money math and the scripted markets. Run: npm run check
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerRealMarket, type MarketFile } from "./real-market.ts";
import { advance, ask, companiesOf, dateOf, deposit, execute, fee, growth, newAccount, newSim, placeOrder, priceAt, priceNow, replayBarsOf, riskScore, round2, universeOf, addPlan } from "./engine.ts";
import { runBots } from "./bots.ts";
import { MAIN, REPLAYS } from "./scenarios.ts";
import { buildReplayMarket } from "./replay-market.ts";

// Fees and trades
assert.equal(fee(1000), 7.4);
const a = newAccount(100);
assert.equal(execute(a, "DTE", "buy", 2, 29.84, 0), null); // ask 29,87 → 59,74 + 5,05
assert.equal(a.cash, 35.21);
assert.deepEqual(a.holdings.DTE, { qty: 2, cost: 64.79 });
assert.match(execute(a, "DTE", "sell", 3, 30, 1)!, /more than you own/);
assert.match(execute(a, "DTE", "buy", 10, 30, 1)!, /Not enough money/);
assert.match(execute(a, "DTE", "buy", 1.5, 30, 1)!, /whole number/);

// Universe is deterministic and starts at the company's start price
const u = universeOf("main");
assert.equal(priceAt(u, "DTE", 0), 29.84);
assert.equal(priceAt(u, "SAP", 300), priceAt(universeOf("main"), "SAP", 300));
assert.ok(priceAt(u, "MSCIW", 2500) > 0);

// Deposits never count as profit
let s = deposit(newSim("main", 0), 100);
s = placeOrder(s, { sym: "DTE", side: "buy", qty: 2, type: "limit", limit: 30 }).sim;
assert.equal(s.acct.trades.length, 1, "marketable limit fills now");
s = placeOrder(s, { sym: "DTE", side: "buy", qty: 1, type: "limit", limit: 1 }).sim;
assert.equal(s.acct.orders.length, 1, "limit far below waits");
const later = advance(s, 5).sim;
assert.equal(later.acct.orders.length, 0, "good-for-day order expired");
assert.equal(later.day, 5);
const g = growth(deposit(later, 1000).acct.values, deposit(later, 1000).acct.deposits);
assert.ok(Math.abs(g[g.length - 1] - g[g.length - 2]) < 0.05, "a deposit doesn't jump the growth curve");

// Savings plan buys monthly
let p = addPlan(newSim("w4-plan", 0), { sym: "MSCIW", amount: 25 });
p = advance(p, 2520).sim;
assert.equal(p.acct.trades.length, 120, "120 monthly executions in 10 years");

// A trading session has one price across both charts, quotes, orders and bot trades.
assert.equal(replayBarsOf(MAIN), undefined);
for (const { universe } of Object.values(REPLAYS).filter((r) => r.universe.historical)) {
  const bars = replayBarsOf(universe)!;
  const regenerated = buildReplayMarket(universe, universe.historical!, companiesOf(universe).reverse());
  assert.deepEqual(regenerated, bars, `${universe.id}: seeded bars are independent of watchlist order`);
  for (const [sym, sessions] of Object.entries(bars)) {
    assert.equal(sessions.length, universe.history + universe.days + 1);
    for (const [day, close] of universe.paths?.[sym] ?? []) {
      assert.equal(sessions[universe.history + day].close, close, `${universe.id}/${sym}: exact anchor on day ${day}`);
    }
    for (const [i, b] of sessions.entries()) {
      assert.ok([b.open, b.high, b.low, b.close, b.activity].every((n) => Number.isFinite(n) && n > 0));
      assert.ok(b.low <= Math.min(b.open, b.close) && b.high >= Math.max(b.open, b.close));
      assert.equal(priceAt(universe, sym, i - universe.history), b.close);
    }
  }
}

const covid = REPLAYS.covid.universe;
const dax = (day: number) => priceAt(covid, "DAXETF", day);
for (const [day, expectedDrop] of [[25, 0.0794], [28, 0.1224]]) {
  assert.ok(Math.abs(1 - dax(day) / dax(day - 1) - expectedDrop) < 0.001, "the selloff lands on the news session");
  const before = advance(newSim(covid.id, 1000), day - 1).sim;
  const { sim, events } = advance(before, 5, { stopAtMajor: true });
  assert.equal(sim.day, day, "fast-forward pauses on the selloff");
  assert.ok(events.some((e) => e.kind === "news" && e.day === day));
  assert.equal(priceNow(sim, "DAXETF"), dax(day));
  const order = placeOrder(sim, { sym: "DAXETF", side: "buy", qty: 1, type: "market" });
  assert.equal(order.filled?.price, ask(dax(day)), "the order is priced from the chart close plus spread");
}
const vaccine = covid.news.find((n) => n.session === "2020-11-09")!.day;
assert.ok(Math.abs(dax(vaccine) / dax(vaccine - 1) - 1.0494) < 0.001, "the vaccine jump is a single session");
const daxBars = replayBarsOf(covid)!.DAXETF.slice(covid.history);
assert.ok(daxBars[28].activity > 2 * daxBars[0].activity, "the crash has higher modelled market activity");
for (const replay of Object.values(REPLAYS).filter((r) => r.universe.historical)) {
  const u = replay.universe;
  const calendar = u.historical!.sessions!;
  for (const item of u.news) assert.equal(calendar[u.history + item.day], item.session);
  for (const [date, open, high, low, close, volume] of quotes[replay.hero]) {
    const index = calendar.indexOf(date);
    if (index < 0) continue;
    const bar = replayBarsOf(u)![replay.hero][index];
    assert.deepEqual([bar.open, bar.high, bar.low, bar.close, bar.volume ?? null], [open, high, low, close, volume]);
  }
}

// Scripted bots still demonstrate their intended mistakes.
assert.equal(priceAt(universeOf("replay-wirecard"), "WDI", 6), 104.5);
assert.equal(priceAt(universeOf("replay-wirecard"), "WDI", 12), 3.53);
const bots = runBots(REPLAYS.wirecard);
const alex = bots.find((b) => b.id === "alex")!;
assert.ok(riskScore(alex.acct.values) < -50, "All-in Alex is wiped out by Wirecard");
const sam = bots.find((b) => b.id === "sam")!;
assert.ok(riskScore(sam.acct.values) > riskScore(alex.acct.values));
const max = runBots(REPLAYS.gamestop).find((b) => b.id === "max")!;
assert.ok(max.acct.values.at(-1)! < 600, "FOMO Max loses on GameStop");
const paula = runBots(REPLAYS.covid).find((b) => b.id === "paula")!;
const samC = runBots(REPLAYS.covid).find((b) => b.id === "sam")!;
assert.ok(riskScore(paula.acct.values) < riskScore(samC.acct.values), "Panic Paula trails Steady Sam");
// simulated boss rounds: every boss trails Steady Sam, so beating the boss with the safe strategy is possible
for (const id of ["hype", "sneakers", "scare"]) {
  const run = runBots(REPLAYS[id]);
  const boss = run.find((b) => b.id === REPLAYS[id].boss)!, s = run.find((b) => b.id === "sam")!;
  assert.ok(riskScore(boss.acct.values) < riskScore(s.acct.values), `${id}: the boss trails Steady Sam`);
  assert.ok(REPLAYS[id].universe.news.every((n) => !n.sym), `${id}: simulated news is never about one real company`);
}
assert.ok(MAIN.news.every((n) => !n.sym), "free-play news is never about one real company");

const marketFile: MarketFile = JSON.parse(readFileSync(new URL("../../../public/market/yahoo-daily.json", import.meta.url), "utf8"));
const real = registerRealMarket(marketFile, new Date("2026-11-21T12:00:00Z"));
assert.equal(real.startDate, "2026-10-07", "a new market starts on a shared session within the intraday window");
assert.ok(real.days > 10, "there are sessions to replay after the starting day");
assert.equal(companiesOf(real).length, 70);
const dates = real.historical!.sessions!;
const bars = real.observedBars!;
const fxDates = Object.keys(marketFile.eurUsd).sort().reverse();
for (const [sym, stock] of Object.entries(marketFile.stocks)) {
  const source = new Map(stock.bars.map((row) => [row[0], row]));
  for (const [i, date] of dates.entries()) {
    const observed = source.get(date);
    const bar = bars[sym][i];
    assert.equal(dateOf(real, i - real.history).toISOString().slice(0, 10), date);
    assert.equal(priceAt(real, sym, i - real.history), bar.close);
    if (!observed) {
      assert.equal(bar.closed, true);
      assert.equal(bar.close, bars[sym][i - 1].close);
      continue;
    }
    const rate = stock.currency === "USD" ? marketFile.eurUsd[fxDates.find((d) => d <= date)!] : 1;
    assert.deepEqual([bar.open, bar.high, bar.low, bar.close, bar.volume],
      [...observed.slice(1, 5).map((price) => round2(Number(price) / rate)), observed[5]]);
  }
}
const closedDay = dates.indexOf("2025-07-04") - real.history;
const closedSim = { ...newSim(real.id, 1000), day: closedDay };
assert.match(placeOrder(closedSim, { sym: "AAPL", side: "buy", qty: 1, type: "market" }).error!, /no trading session/);
assert.equal(placeOrder(closedSim, { sym: "DTE.DE", side: "buy", qty: 1, type: "market" }).filled?.price,
  ask(priceAt(real, "DTE.DE", closedDay)));

console.log("engine.check: all good");

// Weekly bars can cross a year boundary. Holidays and future sessions must not contribute.
const periodDates = ["2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02", "2025-01-06"];
const sample = periodDates.map((_, i) => ({
  open: 10+i, high: 15+i, low: 6-i, close: 12+i, volume: 10+i, activity: 1, closed: i === 2,
}));
const week = periodBars(periodDates, sample, "2025-01-02", "1W");
assert.deepEqual(week.map(b => [b.date,b.open,b.high,b.low,b.close,b.volume]), [["2024-12-30",10,18,3,15,34]]);
assert.equal(periodBars(periodDates, sample, "2025-01-06", "1W").length, 2);
assert.deepEqual(periodBars(periodDates, sample, "2025-01-02", "1M").map(b => [b.date,b.close,b.volume]),
  [["2024-12-30",13,21],["2025-01-02",15,13]]);
