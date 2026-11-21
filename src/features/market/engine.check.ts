// Self-check for the money math and the scripted markets. Run: npm run check
import assert from "node:assert/strict";
import { advance, deposit, execute, fee, growth, newAccount, newSim, placeOrder, priceAt, riskScore, universeOf, addPlan } from "./engine.ts";
import { runBots } from "./bots.ts";
import { MAIN, REPLAYS } from "./scenarios.ts";

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

// Replays: scripted paths hit their keypoints; bots are deterministic
assert.equal(priceAt(universeOf("replay-wirecard"), "WDI", 6), 104.5);
assert.equal(priceAt(universeOf("replay-wirecard"), "WDI", 12), 3.2);
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
assert.ok(MAIN.news.every((n) => !n.sym), "free-play news is never about one real company");

console.log("engine.check: all good");
