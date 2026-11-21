// Self-check for the Investor Simulator. Run: npm run check
import assert from "node:assert/strict";
import { netWorth, newGame, nextYear, nudge, pay, result, YEARS, type Game, type Split } from "./engine.ts";
import { begin, choose, eventOf, EVENTS } from "./events.ts";

/** Plays a whole life with one split and one pick per choice event. */
function play(seed: number, split: Split, pick: (g: Game) => string) {
  let g = { ...newGame(seed, begin), split };
  while (g.year < YEARS) {
    if (eventOf(g).choices && !g.picked) g = choose(g, pick(g));
    g = nextYear(g, begin);
  }
  return g;
}
const steady: Split = { cushion: 3, etf: 6, stock: 0, spend: 1 };
const goodPick = (g: Game) => ({ crash: "hold", dip: "hold", rebound: "back", hype: "pass", fee: "stay", record: "keep", inflation: "keep", wedding: "small", bonus: "invest", sabbatical: "no", inherit: "all", promo: "save", promo2: "save" } as Record<string, string>)[eventOf(g).id];
const panicPick = (g: Game) => ({ crash: "sell", dip: "sell", rebound: "wait", hype: "all", fee: "switch", record: "stop", inflation: "keep", wedding: "big", bonus: "spend", sabbatical: "go", inherit: "cash", promo: "spend", promo2: "spend" } as Record<string, string>)[eventOf(g).id];

// Every event shows up exactly once, every year has one.
for (let seed = 1; seed <= 60; seed++) {
  const g = newGame(seed, begin);
  assert.equal(g.schedule.length, YEARS);
  for (const id of Object.keys(EVENTS)) assert.equal(g.schedule.filter((e) => e === id).length, 1, `seed ${seed}: ${id}`);
  assert.ok(g.schedule.indexOf("hype") < g.market.crash, "the hype comes before the crash");
  assert.ok(g.schedule.indexOf("kids") > g.schedule.indexOf("wedding"), "wedding first");
}

// Deterministic per seed.
assert.deepEqual(play(7, steady, goodPick).worth, play(7, steady, goodPick).worth);

// The lesson holds on every seed: a steady ETF habit beats the savings account, the mattress and Trader Max.
let wins = 0;
for (let seed = 1; seed <= 60; seed++) {
  const g = play(seed, steady, goodPick);
  const r = result(g);
  assert.ok(r.stars[0], `seed ${seed}: steady beats Anna and the mattress`);
  if (r.stars[1]) wins++;
  assert.ok(r.worth > result(play(seed, steady, panicPick)).worth, `seed ${seed}: panic choices cost money`);
  assert.equal(g.worth.length, YEARS + 1);
}
assert.ok(wins >= 54, `steady beats Max on most seeds (${wins}/60)`);

// Flows explain every euro of a year's change in net worth.
{
  let g = { ...newGame(11, begin), split: steady };
  while (g.year < YEARS) {
    if (eventOf(g).choices && !g.picked) g = choose(g, goodPick(g) ?? eventOf(g).choices![0].id);
    const before = g.worth[g.year];
    g = nextYear(g, begin);
    const f = g.last!;
    const explained = f.salary - f.spent + f.market + f.interest - f.bills + f.gifts;
    assert.ok(Math.abs(g.worth[g.year] - before - explained) < 1, `year ${g.year}: flows add up`);
  }
}

// Bills: cushion first, then a forced sale, then a loan.
let g = newGame(3, begin);
g = { ...g, wallet: { cushion: 1000, etf: 2000, stock: 0, debt: 0 }, alert: null };
g = pay(g, 4000);
assert.deepEqual(g.wallet, { cushion: 0, etf: 0, stock: 0, debt: 1000 });
assert.equal(g.flags.forced, 1); assert.equal(g.flags.borrowed, 1);
assert.equal(netWorth(g.wallet), -1000);

// The split always sums to 10 and stays in range.
let s: Split = { cushion: 3, etf: 4, stock: 1, spend: 2 };
for (let i = 0; i < 20; i++) s = nudge(s, "etf", 1);
assert.deepEqual(s, { cushion: 0, etf: 10, stock: 0, spend: 0 });
s = nudge(nudge(s, "spend", 1), "cushion", -1);
assert.equal(Object.values(s).reduce((a, b) => a + b, 0), 10);

console.log(`invsim.check: all good (steady beats Max on ${wins}/60 seeds)`);
