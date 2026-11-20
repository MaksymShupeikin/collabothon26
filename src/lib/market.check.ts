// Self-check for the money math. Run: npm run check
import assert from "node:assert/strict";
import { COMPANIES } from "./data/companies.ts";
import { createMarket, fee, placeOrder, tick, topUp, trade, valueOf, START_CASH, type Market, type Trader } from "./market.ts";

const t: Trader = { id: "t", name: "t", cash: 10_000, holdings: {}, values: [], trades: [] };
assert.equal(fee(1000), 7.4);
assert.equal(trade(t, "X", "buy", 10, 100, 0), null); // fills at 100.10 → 1001 + 7.40 fee
assert.equal(t.cash, 8991.6);
assert.deepEqual(t.holdings.X, { qty: 10, cost: 1008.4 });
assert.match(trade(t, "X", "sell", 11, 110, 1)!, /more than you own/);
assert.match(trade(t, "X", "buy", 1000, 100, 1)!, /Not enough cash/);
assert.match(trade(t, "X", "buy", 1.5, 100, 1)!, /whole number/);
assert.equal(trade(t, "X", "sell", 10, 110, 1), null); // fills at 109.89 → 1098.90 − 7.65 fee
assert.equal(t.cash, 10082.85);
assert.equal(t.holdings.X, undefined);

const run = (seed: number) => { let m: Market = createMarket(seed, COMPANIES); while (m.day < m.days) m = tick(m); return m; };
const a = run(42), b = run(42), c = run(7);
assert.deepEqual(a.prices, b.prices, "same seed → same market");
assert.notDeepEqual(a.prices, c.prices, "different seed → different market");
for (const s of Object.values(a.prices)) assert.ok(s.length === a.days + 1 && s.every((p) => Number.isFinite(p) && p > 0));
for (const bot of a.bots) assert.equal(bot.values.length, a.days + 1, `${bot.name} has a value every day`);
assert.ok(a.calls.some((x) => x.result), "some bot calls get judged");

// Limit buy waits until the price drops to the limit.
let m = createMarket(42, COMPANIES);
const { m: withOrder, error } = placeOrder(m, { sym: "AAPL", side: "buy", qty: 1, type: "limit", limit: 1 });
assert.equal(error, null);
m = tick(withOrder);
assert.equal(m.orders.length, 1, "limit at 1 € stays open");
assert.equal(valueOf(m, m.player, 0), START_CASH);

// Top-up adds cash without counting as profit.
const before = tick(createMarket(42, COMPANIES));
const after = topUp(before, 5000);
assert.equal(after.player.cash, before.player.cash + 5000);
assert.equal(valueOf(after, after.player) - after.player.values[0], valueOf(before, before.player) - before.player.values[0]);
assert.equal(topUp(before, -1), before);

console.log("market.check: all good");
