import assert from "node:assert/strict";
import {
  BT_SPEEDS,
  cursorAtPos,
  cursorFromIsoDate,
  defaultBacktestCursor,
  resolveTradablePos,
  stepTradableCursor,
  tradableIndices,
} from "./backtest-replay-state.ts";
import type { ReplayBar } from "../market/replay-market.ts";

const openBar = (close: number): ReplayBar => ({ open: close, high: close, low: close, close, activity: 1 });
const closedBar = (close: number): ReplayBar => ({ ...openBar(close), closed: true });

// 1. Filters out closed sessions cleanly
const bars: ReplayBar[] = [
  openBar(10),
  openBar(11),
  closedBar(11), // holiday at index 2
  openBar(12),
  closedBar(12), // holiday at index 4
  openBar(13),
];
const tradable = tradableIndices(bars.length, bars);
assert.deepEqual(tradable, [0, 1, 3, 5]);

// 2. Switching from a stock trading on index 4 to a stock closed on index 4 snaps to nearest earlier tradable bar (index 3), NOT 0!
assert.equal(resolveTradablePos(tradable, 4), 2);
assert.equal(tradable[resolveTradablePos(tradable, 4)], 3);

// 3. Stepping forward/backward from a holiday cursor never jumps to start of history
assert.equal(stepTradableCursor(tradable, 4, 1), 5);
assert.equal(stepTradableCursor(tradable, 4, -1), 1);
assert.equal(stepTradableCursor(tradable, 5, 1), null, "cannot step past latest bar");
assert.equal(stepTradableCursor(tradable, 1, -1), null, "keeps at least 2 bars visible at start");

// 4. Default start cursor clamps cleanly on short and long histories
assert.equal(defaultBacktestCursor(tradable, 63), 1);
const longTradable = Array.from({ length: 120 }, (_, i) => i);
assert.equal(defaultBacktestCursor(longTradable, 63), 56);

// 5. Scrubber position clamping
assert.equal(cursorAtPos(tradable, 0), 1);
assert.equal(cursorAtPos(tradable, 99), 5);
assert.equal(cursorAtPos(tradable, 2), 3);

// 6. Clicking a chart date maps cleanly to the nearest tradable cursor
const times = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07", "2026-07-08"];
assert.equal(cursorFromIsoDate(times, tradable, "2026-07-06"), 3);
assert.equal(cursorFromIsoDate(times, tradable, "2026-07-07"), 3, "holiday date resolves to nearest prior open session");
assert.equal(cursorFromIsoDate(times, tradable, "2026-07-01"), 1, "earliest date keeps 2 bars visible");
assert.equal(cursorFromIsoDate(times, tradable, "2026-07-04"), 1, "weekend resolves to prior open session");

// 7. Speeds include slow inspection (0.5x) through fast scan (10x)
assert.deepEqual([...BT_SPEEDS], [0.5, 1, 2, 5, 10]);

console.log("backtest-replay-state.check: all good");
